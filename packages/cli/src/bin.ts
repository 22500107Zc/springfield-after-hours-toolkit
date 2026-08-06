#!/usr/bin/env node
import process from 'node:process';
import { runCli } from './program.js';

/**
 * Piping `sah` into a command that closes the pipe early — `sah lua-defs check
 * | head`, `sah registry list commands | less` and quitting — makes Node raise
 * EPIPE on the next write. That is normal shell usage, not an error, so the
 * process exits quietly instead of dumping a stack trace over the user's
 * terminal.
 */
for (const stream of [process.stdout, process.stderr]) {
  stream.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EPIPE') process.exit(0);
    throw error;
  });
}

const exitCode = await runCli(process.argv.slice(2));
process.exitCode = exitCode;
