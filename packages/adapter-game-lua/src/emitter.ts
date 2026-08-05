import { escapeLuaString } from '@sah/core';

/**
 * Emits Lua that calls into Donut Team's Game.lua.
 *
 * The rules encoded here come from Game.lua's own README:
 *   - every command is prefixed with `Game.` because they live in a table
 *   - strings must always be quoted, even where Radical's MFK omitted quotes
 *   - backslashes must be escaped (`\\`), which is the easiest thing to get
 *     wrong by hand and the main reason this emitter exists
 *   - conditional blocks are closed with `Game.EndIf()`, not `}`
 *   - inverse conditionals use the `Not_` prefix
 *
 * The emitter tracks scope depth so that generated scripts are correctly
 * nested and every opened scope is closed.
 */

export type LuaArgument = string | number | boolean;

export class ScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScopeError';
  }
}

export interface EmittedLine {
  text: string;
  depth: number;
}

export class GameLuaEmitter {
  readonly #lines: EmittedLine[] = [];
  readonly #scopes: string[] = [];
  #conditionalDepth = 0;
  readonly #indentUnit: string;

  constructor(indentUnit = '\t') {
    this.#indentUnit = indentUnit;
  }

  /** Current scope, e.g. "Mission", "Stage", "Objective". */
  get currentScope(): string | undefined {
    return this.#scopes[this.#scopes.length - 1];
  }

  get openScopes(): readonly string[] {
    return this.#scopes;
  }

  comment(text: string): this {
    for (const line of text.split('\n')) {
      this.#lines.push({ text: `-- ${line}`, depth: this.#depth() });
    }
    return this;
  }

  blank(): this {
    this.#lines.push({ text: '', depth: 0 });
    return this;
  }

  raw(text: string): this {
    this.#lines.push({ text, depth: this.#depth() });
    return this;
  }

  /** Emits `Game.<command>(<args>)`. */
  call(command: string, args: readonly LuaArgument[] = []): this {
    this.#lines.push({
      text: `Game.${command}(${args.map(formatArgument).join(', ')})`,
      depth: this.#depth(),
    });
    return this;
  }

  /** Emits a call that opens a scope, and records it. */
  open(scope: string, command: string, args: readonly LuaArgument[] = []): this {
    this.call(command, args);
    this.#scopes.push(scope);
    return this;
  }

  /** Emits a call that closes the innermost scope, checking it matches. */
  close(scope: string, command: string): this {
    const current = this.#scopes[this.#scopes.length - 1];
    if (current !== scope) {
      throw new ScopeError(
        `Cannot close ${scope} scope with ${command}: the innermost open scope is ${
          current ?? '(none)'
        }.`,
      );
    }
    this.#scopes.pop();
    this.call(command);
    return this;
  }

  /**
   * Opens a conditional block. Game.lua emits the opening brace itself, so the
   * caller must eventually call `endIf()`.
   */
  beginIf(command: string, args: readonly LuaArgument[] = [], negated = false): this {
    this.call(negated ? `Not_${command}` : command, args);
    this.#conditionalDepth += 1;
    return this;
  }

  endIf(): this {
    if (this.#conditionalDepth === 0) {
      throw new ScopeError('Game.EndIf() called with no open conditional block.');
    }
    this.#conditionalDepth -= 1;
    this.call('EndIf');
    return this;
  }

  /** Throws if any scope or conditional was left open. */
  assertBalanced(): void {
    if (this.#scopes.length > 0) {
      throw new ScopeError(`Unclosed scope(s): ${this.#scopes.join(' > ')}.`);
    }
    if (this.#conditionalDepth !== 0) {
      throw new ScopeError(`${this.#conditionalDepth} conditional block(s) left unclosed.`);
    }
  }

  /** Renders the script with LF endings and a single trailing newline. */
  toString(): string {
    const body = this.#lines
      .map((line) => (line.text === '' ? '' : `${this.#indentUnit.repeat(line.depth)}${line.text}`))
      .join('\n');
    return `${body.replace(/\s+$/, '')}\n`;
  }

  #depth(): number {
    return this.#scopes.length + this.#conditionalDepth;
  }
}

/** Formats one argument as a Lua literal. */
export function formatArgument(value: LuaArgument): string {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Cannot emit non-finite number ${value} as a Lua argument.`);
    }
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return `"${escapeLuaString(value)}"`;
}
