import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The release workflow runs scripts that nothing else in `npm run check` ever
 * touches, so a missing one is invisible until a release is already halfway
 * through. That is exactly how 0.1.1 failed: `.gitignore` carried a bare
 * `dist/`, which matched `scripts/dist/` as well as every package's build
 * output, and the four packaging scripts were never committed. Every check
 * passed on a commit that could not be built.
 *
 * These tests assert the two properties that failure violated: the scripts
 * exist on disk, and git is actually tracking them.
 */

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

function readScripts(): Record<string, string> {
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  };
  return manifest.scripts ?? {};
}

function isTracked(relativePath: string): boolean {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', relativePath], {
      cwd: repoRoot,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

/** Every `.mjs` path mentioned in a string, in repo-relative form. */
function scriptPaths(text: string): string[] {
  return [...text.matchAll(/[\w./-]+\.mjs/g)].map((match) => match[0]);
}

describe('scripts referenced by npm scripts', () => {
  const entries = Object.entries(readScripts());

  it('finds the packaging scripts to check', () => {
    const packaging = entries.filter(([name]) => name.startsWith('dist:'));
    expect(packaging.length).toBeGreaterThan(0);
  });

  it.each(entries)('%s resolves to files that exist', (_name, command) => {
    for (const reference of scriptPaths(command)) {
      expect(fs.existsSync(path.join(repoRoot, reference)), reference).toBe(true);
    }
  });

  it.each(entries)('%s resolves to files git is tracking', (_name, command) => {
    for (const reference of scriptPaths(command)) {
      // An untracked script works locally and vanishes on a fresh clone, which
      // is all a CI runner ever has.
      expect(isTracked(reference), `${reference} is not tracked by git`).toBe(true);
    }
  });
});

describe('scripts referenced by the release workflow', () => {
  const workflow = fs.readFileSync(
    path.join(repoRoot, '.github', 'workflows', 'release.yml'),
    'utf8',
  );
  const referenced = [...new Set(scriptPaths(workflow))];

  it('references the packaging scripts', () => {
    expect(referenced.length).toBeGreaterThan(0);
  });

  it.each(referenced)('%s exists and is tracked', (reference) => {
    expect(fs.existsSync(path.join(repoRoot, reference)), reference).toBe(true);
    expect(isTracked(reference), `${reference} is not tracked by git`).toBe(true);
  });
});

describe('the ignore rules that caused the failure', () => {
  const ignore = fs.readFileSync(path.join(repoRoot, '.gitignore'), 'utf8');
  const patterns = ignore
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  it('never ignores "dist" at an unanchored depth', () => {
    // `/dist/` and `packages/*/dist/` are fine; a bare `dist/` is not.
    expect(patterns).not.toContain('dist');
    expect(patterns).not.toContain('dist/');
    expect(patterns).not.toContain('**/dist/');
  });

  it('still ignores the build output it is meant to', () => {
    expect(isTracked('packages/cli/dist/bin.js')).toBe(false);
  });
});
