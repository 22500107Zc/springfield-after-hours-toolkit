/**
 * Errors these tools raise.
 *
 * Pocket tools are aimed at people who make mods, not people who write
 * TypeScript. Every message here is written to be read by someone who has just
 * dragged a folder onto a terminal window: say what went wrong, say which path
 * it was, and say what to do instead.
 */
export class PocketToolError extends Error {
  /** A concrete next step, shown to the user under the message. */
  readonly hint: string | undefined;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = 'PocketToolError';
    this.hint = hint;
  }
}

export function notADirectory(target: string): PocketToolError {
  return new PocketToolError(
    `That is a file, not a folder: ${target}`,
    'Point this command at the folder that contains the mod, not at one file inside it.',
  );
}

export function missing(target: string): PocketToolError {
  return new PocketToolError(
    `Nothing exists at that path: ${target}`,
    'Check the spelling, or drag the folder into the terminal to insert its path.',
  );
}
