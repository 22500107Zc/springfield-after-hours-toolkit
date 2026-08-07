import readline from 'node:readline';

/**
 * Asking questions on the terminal.
 *
 * Deliberately built on `node:readline` rather than a prompt library: this has
 * to survive being compiled into a standalone binary, and every dependency that
 * pokes at the TTY is a thing that can break there.
 *
 * The important property is that **every prompt reads from stdin the same way
 * whether a person or a test is answering.** Piping answers in is not a special
 * mode — it is the same code path, which is what makes the wizard testable
 * without pretending.
 */

export interface PromptIO {
  input: NodeJS.ReadableStream;
  output: NodeJS.WritableStream;
}

export function defaultIO(): PromptIO {
  return { input: process.stdin, output: process.stdout };
}

/** True when a real person is likely at the keyboard. */
export function isInteractive(io: PromptIO = defaultIO()): boolean {
  return Boolean((io.input as NodeJS.ReadStream).isTTY);
}

export class PromptAbortedError extends Error {
  constructor() {
    super('Cancelled.');
    this.name = 'PromptAbortedError';
  }
}

/**
 * One line reader per IO pair, created once and reused.
 *
 * The obvious implementation — open a readline interface, read a line, close it
 * — works for exactly one question and then hangs, because closing the
 * interface ends the underlying stream. Every prompt after the first would wait
 * forever on a stream nobody is going to write to again.
 *
 * So the interface and its async iterator are created lazily and kept for the
 * life of the IO pair. A WeakMap keyed on the IO object keeps the public shape
 * (`{ input, output }`) unchanged and lets the session be collected with it.
 */
const sessions = new WeakMap<PromptIO, AsyncIterator<string>>();

function lineIterator(io: PromptIO): AsyncIterator<string> {
  const existing = sessions.get(io);
  if (existing) return existing;

  const rl = readline.createInterface({ input: io.input, output: io.output, terminal: false });
  const iterator = rl[Symbol.asyncIterator]();
  sessions.set(io, iterator);
  return iterator;
}

/**
 * Reads one line.
 *
 * End-of-input throws rather than returning empty: a test that supplies too few
 * answers should fail loudly, not silently accept defaults it never chose, and
 * a person pressing Ctrl+D means "stop", not "yes".
 */
async function readLine(io: PromptIO, question: string): Promise<string> {
  io.output.write(question);
  const next = await lineIterator(io).next();
  if (next.done) throw new PromptAbortedError();
  return next.value;
}

export interface AskOptions {
  /** The question, without trailing punctuation or the default hint. */
  question: string;
  /** Plain-language explanation shown above the question. */
  explanation?: string;
  /** Used when the answer is blank. */
  defaultValue?: string;
  /** Rejects an answer with a reason; the question is asked again. */
  validate?: (answer: string) => string | undefined;
}

/** Asks for a line of text. */
export async function askText(io: PromptIO, options: AskOptions): Promise<string> {
  for (;;) {
    if (options.explanation) io.output.write(`\n${options.explanation}\n`);

    const suffix = options.defaultValue ? ` [${options.defaultValue}]` : '';
    const answer = (await readLine(io, `${options.question}${suffix}: `)).trim();
    const value = answer.length > 0 ? answer : (options.defaultValue ?? '');

    if (value.length === 0) {
      io.output.write('  That cannot be empty. Please type something.\n');
      continue;
    }

    const problem = options.validate?.(value);
    if (problem) {
      io.output.write(`  ${problem}\n`);
      continue;
    }
    return value;
  }
}

/** Asks a yes/no question. */
export async function askYesNo(
  io: PromptIO,
  options: { question: string; explanation?: string; defaultValue: boolean },
): Promise<boolean> {
  for (;;) {
    if (options.explanation) io.output.write(`\n${options.explanation}\n`);

    const hint = options.defaultValue ? '[Y/n]' : '[y/N]';
    const answer = (await readLine(io, `${options.question} ${hint}: `)).trim().toLowerCase();

    if (answer.length === 0) return options.defaultValue;
    if (['y', 'yes'].includes(answer)) return true;
    if (['n', 'no'].includes(answer)) return false;

    io.output.write('  Please answer y or n.\n');
  }
}

export interface MenuChoice<T> {
  label: string;
  value: T;
  /** One line explaining what this does, in plain language. */
  description?: string;
}

/**
 * Presents a numbered menu.
 *
 * Numbers rather than arrow keys: arrow-key menus need raw TTY mode, which does
 * not survive piping, does not test cleanly, and behaves differently across the
 * terminals people actually use.
 */
export async function askMenu<T>(
  io: PromptIO,
  options: { question: string; explanation?: string; choices: Array<MenuChoice<T>> },
): Promise<T> {
  for (;;) {
    if (options.explanation) io.output.write(`\n${options.explanation}\n`);
    io.output.write('\n');

    options.choices.forEach((choice, index) => {
      io.output.write(`  ${index + 1}. ${choice.label}\n`);
      if (choice.description) io.output.write(`     ${choice.description}\n`);
    });
    io.output.write('\n');

    const answer = (
      await readLine(io, `${options.question} [1-${options.choices.length}]: `)
    ).trim();
    const index = Number.parseInt(answer, 10);

    if (Number.isInteger(index) && index >= 1 && index <= options.choices.length) {
      const choice = options.choices[index - 1];
      if (choice) return choice.value;
    }
    io.output.write(`  Please type a number from 1 to ${options.choices.length}.\n`);
  }
}
