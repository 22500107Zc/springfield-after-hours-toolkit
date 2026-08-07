#!/usr/bin/env node
/**
 * Step 2: turn the bundle into standalone executables.
 *
 * Packaging tool: **@yao-pkg/pkg**, pinned in package.json.
 *
 * Why that one, having checked rather than assumed:
 *
 * - `vercel/pkg`, the obvious choice, is archived. Its last release is 5.8.1
 *   and it does not support current Node. Adopting it would be adopting a dead
 *   dependency.
 * - `@yao-pkg/pkg` is its maintained fork, MIT licensed — compatible with this
 *   repository's MIT licence — and supports Node 22 targets.
 * - Node's own Single Executable Applications feature is the long-term answer,
 *   but it is still experimental and shares the CommonJS-only constraint
 *   without offering cross-compilation, which this needs.
 *
 * Cross-compilation: pkg fetches a prebuilt Node binary per target, so one
 * Linux machine can emit macOS and Windows executables. That is convenient but
 * it is **not** verification — a cross-built binary has not been run. The
 * release workflow smoke-tests each artifact on its own native runner, and any
 * target that cannot be executed somewhere is reported as unverified rather
 * than quietly shipped.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const bundleDir = path.join(repoRoot, 'dist-bundle');
const outDir = path.join(bundleDir, 'binaries');

/**
 * The four supported downloads.
 *
 * `id` is what appears in the archive name, and is chosen to be meaningful to
 * someone choosing a download rather than to a build system: a Mac user knows
 * whether their machine is Apple Silicon or Intel, and does not know what
 * "arm64" means.
 */
export const TARGETS = [
  {
    id: 'macos-apple-silicon',
    pkgTarget: 'node22-macos-arm64',
    exe: 'sah',
    os: 'darwin',
    arch: 'arm64',
  },
  { id: 'macos-intel', pkgTarget: 'node22-macos-x64', exe: 'sah', os: 'darwin', arch: 'x64' },
  { id: 'windows-x64', pkgTarget: 'node22-win-x64', exe: 'sah.exe', os: 'win32', arch: 'x64' },
  { id: 'linux-x64', pkgTarget: 'node22-linux-x64', exe: 'sah', os: 'linux', arch: 'x64' },
];

function main() {
  if (!fs.existsSync(path.join(bundleDir, 'sah.cjs'))) {
    process.stderr.write('Run "npm run dist:bundle" first.\n');
    process.exit(1);
  }

  // `--only <id>` builds a single target, which is how each CI runner builds
  // just the artifact it can then actually execute.
  const onlyIndex = process.argv.indexOf('--only');
  const only = onlyIndex === -1 ? undefined : process.argv[onlyIndex + 1];
  const targets = only ? TARGETS.filter((t) => t.id === only) : TARGETS;

  if (targets.length === 0) {
    process.stderr.write(
      `Unknown target "${only}". Known: ${TARGETS.map((t) => t.id).join(', ')}\n`,
    );
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  for (const target of targets) {
    const output = path.join(outDir, target.id, target.exe);
    fs.mkdirSync(path.dirname(output), { recursive: true });

    process.stdout.write(`\nBuilding ${target.id} (${target.pkgTarget})\n`);
    execFileSync(
      process.execPath,
      [
        path.join(repoRoot, 'node_modules', '@yao-pkg', 'pkg', 'lib-es5', 'bin.js'),
        '.',
        '--targets',
        target.pkgTarget,
        '--output',
        output,
      ],
      { cwd: bundleDir, stdio: 'inherit' },
    );

    // The executable bit does not survive every archiving path, and a download
    // that cannot be run is the single most likely way this release fails a
    // beginner. It is set here and asserted again after archiving.
    if (target.os !== 'win32') fs.chmodSync(output, 0o755);

    const size = fs.statSync(output).size;
    process.stdout.write(`  ${(size / 1024 / 1024).toFixed(1)} MB -> ${output}\n`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
