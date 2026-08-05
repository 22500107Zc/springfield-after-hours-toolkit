/**
 * Exit codes for the `sah` binary. Scripts and CI depend on these, so they are
 * part of the public contract.
 */
export const EXIT_CODES = {
  /** Everything succeeded. */
  OK: 0,
  /** The command ran but the campaign has validation errors. */
  VALIDATION_FAILED: 1,
  /** The command was used incorrectly (bad flags, missing argument). */
  USAGE: 2,
  /** A required input did not exist. */
  NOT_FOUND: 3,
  /** The command is recognised but cannot run in this environment. */
  UNSUPPORTED: 4,
  /** Refused to overwrite existing files without --force. */
  REFUSED_OVERWRITE: 5,
  /** An unexpected internal error. */
  INTERNAL: 70,
} as const;

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];

/** An error carrying the exit code the CLI should terminate with. */
export class SahError extends Error {
  readonly exitCode: ExitCode;
  readonly hint: string | undefined;

  constructor(message: string, exitCode: ExitCode = EXIT_CODES.INTERNAL, hint?: string) {
    super(message);
    this.name = 'SahError';
    this.exitCode = exitCode;
    this.hint = hint;
  }
}
