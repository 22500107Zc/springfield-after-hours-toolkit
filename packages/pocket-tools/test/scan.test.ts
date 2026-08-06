import fs from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  PocketToolError,
  requireInsideProject,
  scanDirectory,
  comparePaths,
} from '../src/index.js';
import { at, canSymlink, cleanupTempDirs, makeTree, tempDir, trySymlink } from './helpers.js';

afterAll(cleanupTempDirs);

describe('the safe walk', () => {
  it('lists files POSIX-style, sorted, regardless of host separator', () => {
    const root = makeTree({
      'Meta.ini': '[Miscellaneous]\n',
      'Resources/scripts/b.lua': 'b',
      'Resources/scripts/a.lua': 'a',
    });

    const scan = scanDirectory({ root });
    expect(scan.files.map((file) => file.path)).toEqual([
      'Meta.ini',
      'Resources/scripts/a.lua',
      'Resources/scripts/b.lua',
    ]);
    expect(scan.directories).toEqual(['Resources', 'Resources/scripts']);
  });

  it('records byte sizes', () => {
    const root = makeTree({ 'a.txt': 'hello' });
    expect(scanDirectory({ root }).files[0]?.bytes).toBe(5);
  });

  it('skips .git, because a mod is not its history', () => {
    const root = makeTree({ 'a.txt': 'a', '.git/objects/ab/cdef': 'x', '.gitignore': 'build/' });
    const paths = scanDirectory({ root }).files.map((file) => file.path);
    expect(paths).toEqual(['.gitignore', 'a.txt']);
  });

  it('orders by code unit, not by locale', () => {
    // Locale collation would sort these differently on different ICU builds;
    // a manifest must not depend on which Node the author happens to run.
    expect(['b', 'A', 'a', 'B'].sort(comparePaths)).toEqual(['A', 'B', 'a', 'b']);
  });

  it('resolves a root that is itself reached through a symlink', () => {
    // /tmp is a symlink to /private/tmp on macOS; a root that is not resolved
    // would fail every containment check underneath it.
    const root = makeTree({ 'a.txt': 'a' });
    expect(scanDirectory({ root }).root).toBe(fs.realpathSync(root));
  });

  it('refuses a path that does not exist', () => {
    expect(() => scanDirectory({ root: path.join(tempDir(), 'nope') })).toThrow(PocketToolError);
  });

  it('refuses a file where a folder is required, in plain language', () => {
    const root = makeTree({ 'a.txt': 'a' });
    expect(() => scanDirectory({ root: at(root, 'a.txt') })).toThrow(/file, not a folder/i);
  });
});

describe.skipIf(!canSymlink())('symbolic links', () => {
  it('records a link pointing inside the project without following it', () => {
    const root = makeTree({ 'real/file.txt': 'contents' });
    trySymlink(at(root, 'real/file.txt'), at(root, 'link.txt'));

    const scan = scanDirectory({ root });
    expect(scan.symlinks.map((link) => link.path)).toEqual(['link.txt']);
    expect(scan.symlinks[0]?.escapes).toBe(false);
    // The link's target is NOT listed a second time as a file.
    expect(scan.files.map((file) => file.path)).toEqual(['real/file.txt']);
  });

  it('flags a link pointing outside the project', () => {
    const outside = makeTree({ 'secret.txt': 'not yours' });
    const root = makeTree({ 'a.txt': 'a' });
    trySymlink(at(outside, 'secret.txt'), at(root, 'escape.txt'));

    const scan = scanDirectory({ root });
    expect(scan.symlinks[0]?.escapes).toBe(true);
    // Crucially, the outside file is never read or listed.
    expect(scan.files.map((file) => file.path)).toEqual(['a.txt']);
  });

  it('does not walk into a symlinked directory', () => {
    const outside = makeTree({ 'deep/treasure.txt': 'x' });
    const root = makeTree({ 'a.txt': 'a' });
    trySymlink(outside, at(root, 'linked-dir'), 'dir');

    const scan = scanDirectory({ root });
    expect(scan.files.map((file) => file.path)).toEqual(['a.txt']);
    expect(scan.symlinks.map((link) => link.path)).toEqual(['linked-dir']);
    expect(scan.symlinks[0]?.escapes).toBe(true);
  });

  it('marks a broken link as dangling rather than throwing', () => {
    const root = makeTree({ 'a.txt': 'a' });
    trySymlink(at(root, 'does-not-exist'), at(root, 'broken.txt'));

    const scan = scanDirectory({ root });
    expect(scan.symlinks[0]?.dangling).toBe(true);
  });
});

describe('requireInsideProject', () => {
  it('accepts a file inside the project', () => {
    const root = makeTree({ 'Resources/a.lua': 'a' });
    expect(requireInsideProject(root, 'Resources/a.lua')).toBe(at(root, 'Resources/a.lua'));
  });

  it('accepts an absolute path inside the project', () => {
    const root = makeTree({ 'a.lua': 'a' });
    expect(requireInsideProject(root, at(root, 'a.lua'))).toBe(at(root, 'a.lua'));
  });

  it('refuses .. traversal out of the project', () => {
    const outside = makeTree({ 'secret.txt': 'x' });
    const root = makeTree({ 'a.lua': 'a' });
    const traversal = path.relative(root, at(outside, 'secret.txt'));

    expect(() => requireInsideProject(root, traversal)).toThrow(/outside the project/i);
  });

  it('refuses an absolute path outside the project', () => {
    const outside = makeTree({ 'secret.txt': 'x' });
    const root = makeTree({ 'a.lua': 'a' });
    expect(() => requireInsideProject(root, at(outside, 'secret.txt'))).toThrow(
      /outside the project/i,
    );
  });

  it.skipIf(!canSymlink())('refuses a symlink that escapes the project', () => {
    const outside = makeTree({ 'secret.txt': 'x' });
    const root = makeTree({ 'a.lua': 'a' });
    trySymlink(at(outside, 'secret.txt'), at(root, 'escape.txt'));

    // The link is inside the project; what it points at is not. Resolving
    // first is what makes this a refusal rather than a leak.
    expect(() => requireInsideProject(root, 'escape.txt')).toThrow(/outside the project/i);
  });
});
