#!/usr/bin/env node
/**
 * Step 4: check the archives before anyone downloads them.
 *
 * This runs in the release workflow and locally. It answers the questions that
 * matter about a thing strangers will unzip and run:
 *
 * - does it contain everything it should, and nothing it should not;
 * - does the executable still have its executable bit after archiving;
 * - does it leak the build machine's directory layout;
 * - does it contain anything credential-shaped or any game asset.
 *
 * The build-path check is deliberately precise. A naive search for the build
 * user's home directory matches `icudt78l/coll/root.res` inside the embedded
 * Node runtime — an ICU locale file, not a leak. Reporting that would train
 * everyone to ignore this check, so it looks for real path prefixes only.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const archivesDir = path.join(repoRoot, 'dist-bundle', 'archives');

/** Files every archive must contain, relative to its top-level folder. */
const REQUIRED = [
  'README.md',
  'LICENSE',
  'THIRD_PARTY_NOTICES.md',
  'editor-definitions/Game.meta.lua',
];

/** Nothing matching these may ever ship. */
const FORBIDDEN_PATTERNS = [
  /\.(p3d|rcf|rsd|bik|spt)$/i, // game assets
  /(^|\/)\.env$/i,
  /(^|\/)\.npmrc$/i,
  /(^|\/)\.git\//,
  /(^|\/)node_modules\//,
  /(^|\/)\.DS_Store$/,
  /settings\.local\.json$/,
];

const failures = [];
const notes = [];

function fail(message) {
  failures.push(message);
}

function listArchive(file) {
  if (file.endsWith('.zip')) {
    return execFileSync('unzip', ['-Z', '-1', file], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  }
  return execFileSync('tar', ['-tzf', file], { encoding: 'utf8' }).split('\n').filter(Boolean);
}

/** Long listing, so the executable bit can be inspected without extracting. */
function listArchiveDetailed(file) {
  if (file.endsWith('.zip')) return undefined;
  return execFileSync('tar', ['-tvzf', file], { encoding: 'utf8' }).split('\n').filter(Boolean);
}

/**
 * Real absolute-path prefixes from this machine that must not appear.
 *
 * Anchored with a trailing separator so `/root` does not match `roots`.
 */
function buildPathNeedles() {
  const needles = new Set();
  const home = os.homedir();
  if (home && home !== '/') needles.add(`${home}/`);
  needles.add(`${repoRoot}/`);
  // The paths CI runners use, so a local run catches what CI would.
  needles.add('/home/runner/work/');
  needles.add('/Users/runner/work/');
  return [...needles];
}

function scanForBuildPaths(file, label) {
  const needles = buildPathNeedles();
  const contents = fs.readFileSync(file);
  // latin1 so byte sequences in a binary are searchable as text.
  const text = contents.toString('latin1');

  for (const needle of needles) {
    if (text.includes(needle)) {
      fail(`${label} contains a build-machine path: ${needle}`);
    }
  }
}

function scanForSecrets(file, label) {
  const text = fs.readFileSync(file).toString('latin1');
  const patterns = [
    /sk-ant-[A-Za-z0-9_-]{16,}/,
    /gh[pousr]_[A-Za-z0-9]{20,}/,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  ];
  for (const pattern of patterns) {
    if (pattern.test(text)) fail(`${label} contains something credential-shaped (${pattern})`);
  }
}

function main() {
  if (!fs.existsSync(archivesDir)) {
    process.stderr.write('No archives directory. Run "npm run dist:archives" first.\n');
    process.exit(1);
  }

  const archives = fs
    .readdirSync(archivesDir)
    .filter((name) => name.endsWith('.tar.gz') || name.endsWith('.zip'))
    .sort();

  if (archives.length === 0) {
    process.stderr.write('No archives found.\n');
    process.exit(1);
  }

  for (const name of archives) {
    const file = path.join(archivesDir, name);
    process.stdout.write(`\n${name}\n`);

    const entries = listArchive(file);
    const top = name.replace(/\.(tar\.gz|zip)$/, '');

    // --- required files -----------------------------------------------------
    for (const required of REQUIRED) {
      const wanted = `${top}/${required}`;
      if (!entries.some((entry) => entry.replace(/\/$/, '') === wanted)) {
        fail(`${name} is missing ${required}`);
      }
    }

    // The executable, named per platform.
    const isWindows = name.includes('windows');
    const exe = isWindows ? 'sah.exe' : 'sah';
    if (!entries.some((entry) => entry === `${top}/${exe}`)) {
      fail(`${name} is missing ${exe}`);
    }

    // The Start Here file, named per platform.
    const starter = isWindows
      ? 'Start Here.bat'
      : name.includes('macos')
        ? 'Start Here.command'
        : 'Start Here.sh';
    if (!entries.some((entry) => entry === `${top}/${starter}`)) {
      fail(`${name} is missing "${starter}"`);
    }

    // --- forbidden files ----------------------------------------------------
    for (const entry of entries) {
      for (const pattern of FORBIDDEN_PATTERNS) {
        // sah.exe is the product, not a stray Windows binary.
        if (entry.endsWith('/sah.exe')) continue;
        if (pattern.test(entry)) fail(`${name} contains a forbidden entry: ${entry}`);
      }
    }

    // --- executable bit -----------------------------------------------------
    const detailed = listArchiveDetailed(file);
    if (detailed) {
      for (const needsExec of [exe, starter]) {
        // Match the whole path at the end of the line. `includes` would match
        // the archive's own top-level directory entry first, and a name like
        // "Start Here.sh" contains a space, so splitting on whitespace is out.
        const wanted = `${top}/${needsExec}`;
        const line = detailed.find((entry) => entry.endsWith(wanted));
        if (!line) {
          fail(`${name}: ${needsExec} not found in the detailed listing`);
          continue;
        }
        if (!/^-rwx/.test(line)) {
          fail(
            `${name}: ${needsExec} is not executable inside the archive (${line.split(' ')[0]})`,
          );
        }
      }
    } else {
      // Windows has no executable bit; nothing to assert.
      notes.push(`${name}: zip archive, executable bits not applicable`);
    }

    // --- contents -----------------------------------------------------------
    scanForBuildPaths(file, name);
    scanForSecrets(file, name);

    process.stdout.write(`  ${entries.length} entries checked\n`);
  }

  process.stdout.write('\n');
  for (const note of notes) process.stdout.write(`note: ${note}\n`);

  if (failures.length > 0) {
    process.stdout.write(`\n${failures.length} problem(s):\n`);
    for (const failure of failures) process.stdout.write(`  FAIL  ${failure}\n`);
    process.exit(1);
  }

  process.stdout.write('\nAll archives passed every check.\n');
}

// Concatenating the "file://" scheme onto process.argv[1] looks equivalent
// and is not: on Windows argv[1] is a backslashed drive path, so that
// comparison is always false and the script exits silently having done
// nothing. That is how the Windows download went missing from the first
// 0.1.1 release attempt.
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
