/**
 * Entry point used only when building a standalone executable.
 *
 * It exists for one reason: `bin.ts` uses top-level `await`, and the bundler
 * that produces the single CommonJS file the packager needs cannot represent
 * that. Wrapping the same call in an async function is the whole difference —
 * there is no separate behaviour here, and `bin.ts` remains the entry point for
 * everyone running from source.
 *
 * The version is injected at build time (see `scripts/packaging/bundle.mjs`).
 * Inside a packaged binary there is no repository to read `package.json` from,
 * and silently reporting the wrong version is worse than not reporting one.
 */
import process from 'node:process';
import { runCli } from './program.js';
import { setPackagedVersion } from './context.js';

declare const __SAH_VERSION__: string | undefined;

for (const stream of [process.stdout, process.stderr]) {
  stream.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EPIPE') process.exit(0);
    throw error;
  });
}

if (typeof __SAH_VERSION__ === 'string') setPackagedVersion(__SAH_VERSION__);

void (async () => {
  process.exitCode = await runCli(process.argv.slice(2));
})();
