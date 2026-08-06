import fs from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  MANIFEST_FORMAT,
  PocketToolError,
  buildManifest,
  readManifest,
  renderManifestText,
  serialiseManifest,
} from '../src/index.js';
import { at, canSymlink, cleanupTempDirs, makeTree, tempDir, trySymlink } from './helpers.js';

afterAll(cleanupTempDirs);

/**
 * SHA-256 of the empty string and of "a", as fixed external reference values.
 *
 * Hard-coded on purpose: comparing the tool against itself would pass even if
 * it hashed the wrong thing. Reproduce with `printf 'a' | sha256sum`.
 */
const SHA_EMPTY = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const SHA_A = 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb';

describe('contents', () => {
  it('records POSIX paths, sizes and hashes', () => {
    const manifest = buildManifest({ root: makeTree({ 'Resources/a.txt': 'a', 'empty.txt': '' }) });

    expect(manifest.files).toEqual([
      { path: 'Resources/a.txt', bytes: 1, sha256: SHA_A },
      { path: 'empty.txt', bytes: 0, sha256: SHA_EMPTY },
    ]);
    expect(manifest.fileCount).toBe(2);
    expect(manifest.totalBytes).toBe(1);
  });

  it('uses forward slashes even on a host that uses backslashes', () => {
    const manifest = buildManifest({ root: makeTree({ 'a/b/c.txt': 'x' }) });
    expect(manifest.files[0]?.path).toBe('a/b/c.txt');
    expect(manifest.files[0]?.path).not.toContain('\\');
  });

  it('records the folder name but never its absolute path', () => {
    const root = makeTree({ 'a.txt': 'a' });
    const manifest = buildManifest({ root });

    expect(manifest.name).toBe(path.basename(root));
    // A manifest gets shared. It must not carry someone's home directory.
    expect(serialiseManifest(manifest)).not.toContain(root);
  });

  it('handles spaces, apostrophes and Unicode in names', () => {
    const manifest = buildManifest({
      root: makeTree({
        "Krusty's Stuff/a file.txt": 'x',
        'niveau spécial/ünïcode.lua': 'y',
        'emoji 🍩/donut.txt': 'z',
      }),
    });

    expect(manifest.files.map((file) => file.path)).toEqual([
      "Krusty's Stuff/a file.txt",
      'emoji 🍩/donut.txt',
      'niveau spécial/ünïcode.lua',
    ]);
  });
});

describe('determinism', () => {
  it('produces byte-identical output on repeated runs', () => {
    const root = makeTree({ 'b.txt': 'b', 'a/c.txt': 'c', 'a/d.txt': 'd' });

    const first = serialiseManifest(buildManifest({ root }));
    const second = serialiseManifest(buildManifest({ root }));
    expect(second).toBe(first);
  });

  it('does not depend on the order files were created in', () => {
    const forward = makeTree({ 'a.txt': '1', 'b.txt': '2', 'c.txt': '3' });
    const backward = makeTree({ 'c.txt': '3', 'b.txt': '2', 'a.txt': '1' });

    expect(buildManifest({ root: forward }).contentId).toBe(
      buildManifest({ root: backward }).contentId,
    );
  });

  it('contains no timestamp', () => {
    const serialised = serialiseManifest(buildManifest({ root: makeTree({ 'a.txt': 'a' }) }));
    expect(serialised).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    expect(serialised.toLowerCase()).not.toContain('generated');
  });

  it('ends with exactly one newline', () => {
    const serialised = serialiseManifest(buildManifest({ root: makeTree({ 'a.txt': 'a' }) }));
    expect(serialised.endsWith('\n')).toBe(true);
    expect(serialised.endsWith('\n\n')).toBe(false);
  });

  it('gives different content ids to different content', () => {
    const before = buildManifest({ root: makeTree({ 'a.txt': 'one' }) });
    const after = buildManifest({ root: makeTree({ 'a.txt': 'two' }) });
    expect(after.contentId).not.toBe(before.contentId);
  });

  it('gives different content ids when only a path changes', () => {
    const before = buildManifest({ root: makeTree({ 'a.txt': 'same' }) });
    const after = buildManifest({ root: makeTree({ 'b.txt': 'same' }) });
    expect(after.contentId).not.toBe(before.contentId);
  });
});

describe('self-exclusion', () => {
  it('excludes a named file', () => {
    const root = makeTree({ 'a.txt': 'a', 'manifest.json': '{}' });
    const manifest = buildManifest({ root, exclude: ['manifest.json'] });
    expect(manifest.files.map((file) => file.path)).toEqual(['a.txt']);
  });

  it('lets a manifest be written into the folder it describes without changing it', () => {
    const root = makeTree({ 'a.txt': 'a', 'b.txt': 'b' });

    const first = buildManifest({ root, exclude: ['manifest.json'] });
    fs.writeFileSync(at(root, 'manifest.json'), serialiseManifest(first));

    // The second run sees the manifest on disk and must still produce the same
    // answer — otherwise no manifest could ever describe its own folder.
    const second = buildManifest({ root, exclude: ['manifest.json'] });
    expect(serialiseManifest(second)).toBe(serialiseManifest(first));
  });
});

describe.skipIf(!canSymlink())('symbolic links', () => {
  it('records a link without following it or hashing its target', () => {
    const root = makeTree({ 'real.txt': 'contents' });
    trySymlink('real.txt', at(root, 'alias.txt'));

    const manifest = buildManifest({ root });
    expect(manifest.files.map((file) => file.path)).toEqual(['real.txt']);
    expect(manifest.symlinks).toEqual([
      { path: 'alias.txt', target: 'real.txt', escapes: false, dangling: false },
    ]);
  });

  it('never hashes a file outside the folder through a link', () => {
    const outside = makeTree({ 'secret.txt': 'not yours' });
    const root = makeTree({ 'a.txt': 'a' });
    trySymlink(at(outside, 'secret.txt'), at(root, 'escape.txt'));

    const manifest = buildManifest({ root });
    expect(manifest.files.map((file) => file.path)).toEqual(['a.txt']);
    expect(manifest.symlinks[0]?.escapes).toBe(true);
  });

  it('keeps links out of the content id', () => {
    const withoutLink = makeTree({ 'a.txt': 'a' });
    const withLink = makeTree({ 'a.txt': 'a' });
    trySymlink('a.txt', at(withLink, 'alias.txt'));

    // Same files, same id. The link is reported, not counted as content.
    expect(buildManifest({ root: withLink }).contentId).toBe(
      buildManifest({ root: withoutLink }).contentId,
    );
  });
});

describe('text output', () => {
  it('lists hash, size and path', () => {
    const text = renderManifestText(buildManifest({ root: makeTree({ 'a.txt': 'a' }) }));
    expect(text).toContain(SHA_A);
    expect(text).toContain('a.txt');
    expect(text).toContain('1 files, 1 bytes');
  });

  it('is deterministic too', () => {
    const root = makeTree({ 'a.txt': 'a', 'b.txt': 'b' });
    expect(renderManifestText(buildManifest({ root }))).toBe(
      renderManifestText(buildManifest({ root })),
    );
  });
});

describe('reading a manifest back', () => {
  it('round-trips', () => {
    const root = makeTree({ 'a.txt': 'a' });
    const manifest = buildManifest({ root });
    const file = path.join(tempDir(), 'manifest.json');
    fs.writeFileSync(file, serialiseManifest(manifest));

    expect(readManifest(file)).toEqual(manifest);
  });

  it('refuses a JSON file that is not a manifest', () => {
    const file = path.join(tempDir(), 'other.json');
    fs.writeFileSync(file, JSON.stringify({ files: [] }));

    // Silently accepting this would report every file as deleted.
    expect(() => readManifest(file)).toThrow(/not a manifest made by this tool/i);
  });

  it('refuses a file that is not JSON at all', () => {
    const file = path.join(tempDir(), 'notes.txt');
    fs.writeFileSync(file, 'hello');
    expect(() => readManifest(file)).toThrow(PocketToolError);
  });

  it('refuses a manifest from a different version', () => {
    const file = path.join(tempDir(), 'manifest.json');
    fs.writeFileSync(file, JSON.stringify({ format: MANIFEST_FORMAT, version: 99, files: [] }));
    expect(() => readManifest(file)).toThrow(/different version/i);
  });
});
