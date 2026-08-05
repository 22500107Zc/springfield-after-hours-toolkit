#!/usr/bin/env node
/**
 * Fetches pinned upstream dependencies into the git-ignored `vendor/` directory.
 *
 * WHY FETCH RATHER THAN VENDOR
 * ----------------------------
 * Donut Team's Game.lua is MIT licensed, so vendoring it would be permitted.
 * This repository fetches it instead for three reasons:
 *
 *   1. The repository stays free of third-party code, so "what did you write?"
 *      has a clean answer.
 *   2. The pin lives in data/upstream/upstream.lock.json with a SHA-256 per
 *      file, so a fetch is verifiable rather than trusted.
 *   3. Upstream keeps ownership of its own distribution.
 *
 * Licence files are always fetched alongside the code, and the integrity of
 * every file with a recorded hash is checked before it is written.
 *
 * Usage:
 *   node scripts/upstream/fetch-upstream.mjs [--dependency <name>] [--verify]
 *
 *   --verify   Check existing vendored files against the lockfile without
 *              downloading anything.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const lockPath = path.join(repoRoot, 'data', 'upstream', 'upstream.lock.json');
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

const args = process.argv.slice(2);
const verifyOnly = args.includes('--verify');
const dependencyIndex = args.indexOf('--dependency');
const onlyDependency = dependencyIndex >= 0 ? args[dependencyIndex + 1] : undefined;

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

function log(message) {
  process.stdout.write(`${message}\n`);
}

async function fetchFile(repository, commit, filePath) {
  const url = `https://raw.githubusercontent.com/${repository}/${commit}/${filePath}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

let failures = 0;
let fetched = 0;
let verified = 0;

for (const [name, dependency] of Object.entries(lock.dependencies)) {
  if (onlyDependency && name !== onlyDependency) continue;

  if (!dependency.vendorPath || dependency.files.length === 0) {
    log(`- ${name}: nothing to fetch (role: ${dependency.role})`);
    continue;
  }

  log(`\n${name} @ ${dependency.commit.slice(0, 12)}  [${dependency.license}]`);
  const vendorRoot = path.join(repoRoot, dependency.vendorPath);

  for (const file of dependency.files) {
    const target = path.join(vendorRoot, file.path);

    if (verifyOnly) {
      if (!fs.existsSync(target)) {
        log(`  MISSING  ${file.path}`);
        if (file.required) failures += 1;
        continue;
      }
      if (file.sha256) {
        const actual = sha256(fs.readFileSync(target));
        if (actual !== file.sha256) {
          log(`  MISMATCH ${file.path}`);
          log(`           expected ${file.sha256}`);
          log(`           actual   ${actual}`);
          failures += 1;
          continue;
        }
      }
      log(`  ok       ${file.path}`);
      verified += 1;
      continue;
    }

    try {
      const contents = await fetchFile(dependency.repository, dependency.commit, file.path);

      if (file.sha256) {
        const actual = sha256(contents);
        if (actual !== file.sha256) {
          // A hash mismatch against a pinned commit means either the lockfile is
          // wrong or something is interfering. Either way, do not write the file.
          log(`  REFUSED  ${file.path} — hash does not match the lockfile`);
          log(`           expected ${file.sha256}`);
          log(`           actual   ${actual}`);
          failures += 1;
          continue;
        }
      }

      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, contents);
      log(`  fetched  ${file.path} (${contents.length} bytes)`);
      fetched += 1;
    } catch (error) {
      log(`  FAILED   ${file.path}: ${error.message}`);
      if (file.required) failures += 1;
    }
  }

  // Record where the files came from, next to the files themselves.
  if (!verifyOnly && fs.existsSync(vendorRoot)) {
    const readme = [
      `# ${name}`,
      '',
      'This directory is FETCHED, not authored here, and is git-ignored.',
      '',
      `Source:    ${dependency.url}`,
      `Commit:    ${dependency.commit}`,
      `License:   ${dependency.license}`,
      dependency.copyright ? `Copyright: ${dependency.copyright}` : '',
      '',
      dependency.description,
      '',
      'Re-fetch with:  npm run upstream:fetch',
      'Verify with:    node scripts/upstream/fetch-upstream.mjs --verify',
      '',
    ]
      .filter((line) => line !== undefined)
      .join('\n');
    fs.writeFileSync(path.join(vendorRoot, 'FETCHED-FROM.md'), readme, 'utf8');
  }
}

log('');
if (verifyOnly) {
  log(`Verified ${verified} file(s), ${failures} problem(s).`);
} else {
  log(`Fetched ${fetched} file(s), ${failures} failure(s).`);
  if (failures === 0 && fetched > 0) {
    log('');
    log('Game.lua is now available to the build. Note that this toolkit does not');
    log('redistribute it — each user fetches it from Donut Team under their MIT licence.');
  }
}

process.exit(failures === 0 ? 0 : 1);
