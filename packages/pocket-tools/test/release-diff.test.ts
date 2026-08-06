import fs from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  buildManifest,
  compareManifests,
  diffReleases,
  hasDifferences,
  serialiseManifest,
  type Manifest,
} from '../src/index.js';
import { cleanupTempDirs, makeTree, tempDir } from './helpers.js';

afterAll(cleanupTempDirs);

/**
 * Builds a manifest in memory.
 *
 * Case-only changes cannot be created on a case-insensitive filesystem, so the
 * tests that need them construct both sides directly. That is not a weakened
 * test — the diff's input is a manifest, so a manifest is the honest input.
 */
function manifestOf(name: string, files: Record<string, string>): Manifest {
  const root = makeTree({});
  for (const [relative, contents] of Object.entries(files)) {
    const absolute = path.join(root, ...relative.split('/'));
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, contents);
  }
  return { ...buildManifest({ root }), name };
}

/** Rewrites a manifest's paths, to fake a rename the host filesystem forbids. */
function renamed(manifest: Manifest, from: string, to: string): Manifest {
  const files = manifest.files.map((file) => (file.path === from ? { ...file, path: to } : file));
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return { ...manifest, files };
}

describe('added, removed, modified', () => {
  it('classifies each correctly', () => {
    const before = manifestOf('v1', { 'keep.txt': 'same', 'gone.txt': 'x', 'edit.txt': 'old' });
    const after = manifestOf('v2', { 'keep.txt': 'same', 'new.txt': 'y', 'edit.txt': 'new' });

    const diff = compareManifests(before, after);
    expect(diff.added.map((change) => change.path)).toEqual(['new.txt']);
    expect(diff.removed.map((change) => change.path)).toEqual(['gone.txt']);
    expect(diff.modified.map((change) => change.path)).toEqual(['edit.txt']);
    expect(diff.counts.unchanged).toBe(1);
  });

  it('records both hashes for a modified file', () => {
    const before = manifestOf('v1', { 'a.txt': 'old' });
    const after = manifestOf('v2', { 'a.txt': 'new' });

    const change = compareManifests(before, after).modified[0];
    expect(change?.beforeSha256).toBeDefined();
    expect(change?.afterSha256).toBeDefined();
    expect(change?.beforeSha256).not.toBe(change?.afterSha256);
  });

  it('reports no differences between identical releases', () => {
    const before = manifestOf('v1', { 'a.txt': 'x', 'b/c.txt': 'y' });
    const after = manifestOf('v2', { 'a.txt': 'x', 'b/c.txt': 'y' });

    const diff = compareManifests(before, after);
    expect(hasDifferences(diff)).toBe(false);
    expect(diff.identical).toBe(true);
    expect(diff.counts.unchanged).toBe(2);
  });

  it('omits unchanged files from the listing unless asked', () => {
    const before = manifestOf('v1', { 'a.txt': 'x' });
    const after = manifestOf('v2', { 'a.txt': 'x' });

    expect(compareManifests(before, after).unchanged).toEqual([]);
    expect(compareManifests(before, after, true).unchanged).toHaveLength(1);
  });

  it('reports the net size change', () => {
    const before = manifestOf('v1', { 'a.txt': 'aaaaa' });
    const after = manifestOf('v2', { 'a.txt': 'aa' });
    expect(compareManifests(before, after).byteDelta).toBe(-3);
  });
});

describe('rename candidates', () => {
  it('pairs a removal with an addition of identical content', () => {
    const before = manifestOf('v1', { 'old/name.lua': 'unchanged contents' });
    const after = renamed(
      manifestOf('v2', { 'old/name.lua': 'unchanged contents' }),
      'old/name.lua',
      'new/name.lua',
    );

    const diff = compareManifests(before, after);
    expect(diff.renameCandidates).toEqual([
      {
        from: 'old/name.lua',
        to: 'new/name.lua',
        bytes: 'unchanged contents'.length,
        sha256: before.files[0]?.sha256,
      },
    ]);
  });

  it('does not pair files whose contents differ', () => {
    const before = manifestOf('v1', { 'old.lua': 'one' });
    const after = manifestOf('v2', { 'new.lua': 'two' });
    expect(compareManifests(before, after).renameCandidates).toEqual([]);
  });

  it('pairs each side only once', () => {
    const before = manifestOf('v1', { 'a.txt': 'same', 'b.txt': 'same' });
    const after = renamed(
      renamed(manifestOf('v2', { 'a.txt': 'same', 'b.txt': 'same' }), 'a.txt', 'c.txt'),
      'b.txt',
      'd.txt',
    );

    const diff = compareManifests(before, after);
    expect(diff.renameCandidates).toHaveLength(2);
    expect(diff.renameCandidates.map((rename) => rename.to).sort()).toEqual(['c.txt', 'd.txt']);
  });

  it('is stable when several files share a hash', () => {
    const before = manifestOf('v1', { 'a.txt': '', 'b.txt': '' });
    const after = renamed(
      renamed(manifestOf('v2', { 'a.txt': '', 'b.txt': '' }), 'a.txt', 'x.txt'),
      'b.txt',
      'y.txt',
    );

    // Ambiguous by nature — which is exactly why these are *candidates*. What
    // matters is that the answer does not change between runs.
    const first = compareManifests(before, after).renameCandidates;
    const second = compareManifests(before, after).renameCandidates;
    expect(second).toEqual(first);
  });
});

describe('case-only path changes', () => {
  it('detects a path that changed only in case', () => {
    const before = manifestOf('v1', { 'Scripts/Main.lua': 'contents' });
    const after = renamed(
      manifestOf('v2', { 'Scripts/Main.lua': 'contents' }),
      'Scripts/Main.lua',
      'scripts/main.lua',
    );

    const diff = compareManifests(before, after);
    expect(diff.caseOnlyChanges).toEqual([
      { from: 'Scripts/Main.lua', to: 'scripts/main.lua', contentAlsoChanged: false },
    ]);
  });

  it('notes when the contents changed as well', () => {
    const before = manifestOf('v1', { 'A.txt': 'old' });
    const after = renamed(manifestOf('v2', { 'A.txt': 'new' }), 'A.txt', 'a.txt');

    expect(compareManifests(before, after).caseOnlyChanges[0]?.contentAlsoChanged).toBe(true);
  });

  it('does not also report a case-only change as a rename', () => {
    const before = manifestOf('v1', { 'A.txt': 'same' });
    const after = renamed(manifestOf('v2', { 'A.txt': 'same' }), 'A.txt', 'a.txt');

    const diff = compareManifests(before, after);
    expect(diff.counts.caseOnly).toBe(1);
    expect(diff.renameCandidates).toEqual([]);
  });

  it('counts as a difference', () => {
    const before = manifestOf('v1', { 'A.txt': 'same' });
    const after = renamed(manifestOf('v2', { 'A.txt': 'same' }), 'A.txt', 'a.txt');
    expect(hasDifferences(compareManifests(before, after))).toBe(true);
  });
});

describe('accepting folders and manifests', () => {
  it('compares two folders directly', () => {
    const before = makeTree({ 'a.txt': 'x' });
    const after = makeTree({ 'a.txt': 'y' });

    const diff = diffReleases({ before, after });
    expect(diff.modified.map((change) => change.path)).toEqual(['a.txt']);
  });

  it('compares a manifest against a folder', () => {
    const folder = makeTree({ 'a.txt': 'x' });
    const manifestFile = path.join(tempDir(), 'v1.json');
    fs.writeFileSync(manifestFile, serialiseManifest(buildManifest({ root: folder })));

    fs.writeFileSync(path.join(folder, 'b.txt'), 'new file');

    const diff = diffReleases({ before: manifestFile, after: folder });
    expect(diff.added.map((change) => change.path)).toEqual(['b.txt']);
  });

  it('refuses a path that does not exist', () => {
    expect(() =>
      diffReleases({ before: path.join(tempDir(), 'nope'), after: makeTree({}) }),
    ).toThrow(/Nothing exists at that path/i);
  });
});

describe('determinism', () => {
  it('produces identical JSON for the same comparison', () => {
    const before = manifestOf('v1', { 'a.txt': 'x', 'b.txt': 'y', 'c/d.txt': 'z' });
    const after = manifestOf('v2', { 'a.txt': 'changed', 'c/d.txt': 'z', 'e.txt': 'new' });

    const first = JSON.stringify(compareManifests(before, after));
    const second = JSON.stringify(compareManifests(before, after));
    expect(second).toBe(first);
  });

  it('lists changes in sorted order', () => {
    const before = manifestOf('v1', {});
    const after = manifestOf('v2', { 'z.txt': '1', 'a.txt': '2', 'm.txt': '3' });

    expect(compareManifests(before, after).added.map((change) => change.path)).toEqual([
      'a.txt',
      'm.txt',
      'z.txt',
    ]);
  });
});
