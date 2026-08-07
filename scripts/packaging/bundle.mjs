#!/usr/bin/env node
/**
 * Step 1 of building a standalone executable: bundle the CLI into one
 * CommonJS file.
 *
 * Why CommonJS, when the whole repository is ESM: the packager embeds a script
 * into a Node binary, and that mechanism expects CJS. Two consequences fall out
 * of that, and both are handled here rather than by changing the source:
 *
 * - `import.meta.url` does not exist in CJS. esbuild would silently replace it
 *   with `undefined`, which breaks the code that locates the `data` directory.
 *   The define + banner below restore it from `__filename`.
 * - top-level `await` cannot be represented, which is why there is a separate
 *   `packaged-entry.ts` rather than reusing `bin.ts`.
 *
 * The version is injected here because a packaged binary has no `package.json`
 * to read.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = path.join(repoRoot, 'dist-bundle');

const version = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).version;

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const entry = path.join(repoRoot, 'packages', 'cli', 'src', 'packaged-entry.ts');
const outfile = path.join(outDir, 'sah.cjs');

await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  outfile,
  logLevel: 'warning',
  define: {
    // Restore import.meta.url, which the data-directory lookup depends on.
    'import.meta.url': '__sah_import_meta_url',
    __SAH_VERSION__: JSON.stringify(version),
  },
  banner: {
    js: "const __sah_import_meta_url=require('url').pathToFileURL(__filename).href;",
  },
});

// The packager reads its configuration from a package.json beside the script,
// and embeds `assets` into the binary's virtual filesystem at these same
// relative paths. That is what lets the registry lookup keep working unchanged.
fs.writeFileSync(
  path.join(outDir, 'package.json'),
  `${JSON.stringify(
    {
      name: 'sah',
      version,
      bin: 'sah.cjs',
      pkg: {
        assets: ['data/**/*', 'generated/**/*'],
        outputPath: 'binaries',
      },
    },
    null,
    2,
  )}\n`,
);

// Embedded data. `data/` is the verified registries and their provenance;
// `generated/` is Game.meta.lua, which `sah definitions install` writes into a
// user's project.
fs.cpSync(path.join(repoRoot, 'data'), path.join(outDir, 'data'), { recursive: true });
fs.mkdirSync(path.join(outDir, 'generated'), { recursive: true });
fs.copyFileSync(
  path.join(repoRoot, 'packages', 'game-lua-definitions', 'generated', 'Game.meta.lua'),
  path.join(outDir, 'generated', 'Game.meta.lua'),
);

const bytes = fs.statSync(outfile).size;
process.stdout.write(`Bundled ${(bytes / 1024 / 1024).toFixed(1)} MB -> ${outfile}\n`);
process.stdout.write(`Version injected: ${version}\n`);
