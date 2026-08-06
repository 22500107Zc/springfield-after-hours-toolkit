import { spawnSync } from 'node:child_process';

/**
 * Copying text to the system clipboard.
 *
 * Two rules, and the first one is the important one:
 *
 * 1. **No shell, ever.** `spawnSync` is called with an argument array and
 *    `shell: false`, and the text being copied goes in over **stdin** — never
 *    as an argument, never interpolated into a command string. The text is a
 *    file path chosen by the user, and a path may legally contain quotes,
 *    backticks, semicolons and `$(...)`. Through a shell, one of those becomes
 *    a command; through stdin it is just bytes.
 * 2. **Failing to copy is not failing.** The path is printed either way, so a
 *    machine with no clipboard helper installed still gets the answer.
 */

export interface ClipboardResult {
  copied: boolean;
  /** Which helper was used, or why none was. */
  detail: string;
}

interface ClipboardCommand {
  command: string;
  args: string[];
}

/** Candidate helpers per platform, in order of preference. */
function candidates(): ClipboardCommand[] {
  switch (process.platform) {
    case 'darwin':
      return [{ command: 'pbcopy', args: [] }];
    case 'win32':
      return [{ command: 'clip', args: [] }];
    default:
      return [
        { command: 'wl-copy', args: [] },
        { command: 'xclip', args: ['-selection', 'clipboard'] },
        { command: 'xsel', args: ['--clipboard', '--input'] },
      ];
  }
}

export function copyToClipboard(text: string): ClipboardResult {
  const tried: string[] = [];

  for (const candidate of candidates()) {
    const result = spawnSync(candidate.command, candidate.args, {
      // The text is user-controlled, so it is written to the child's stdin
      // rather than placed anywhere a shell could look at it.
      input: text,
      shell: false,
      windowsHide: true,
      encoding: 'utf8',
    });

    if (result.error) {
      // ENOENT simply means this helper is not installed here.
      tried.push(
        `${candidate.command} (${(result.error as NodeJS.ErrnoException).code ?? 'failed'})`,
      );
      continue;
    }
    if (result.status === 0) {
      return { copied: true, detail: `copied with ${candidate.command}` };
    }
    tried.push(`${candidate.command} (exit ${String(result.status)})`);
  }

  return {
    copied: false,
    detail:
      tried.length > 0
        ? `no clipboard helper worked: ${tried.join(', ')}`
        : 'no clipboard helper is available on this platform',
  };
}
