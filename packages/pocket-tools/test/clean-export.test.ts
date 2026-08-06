import fs from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  PocketToolError,
  cleanExport,
  cleanInPlace,
  planClean,
  classifyJunk,
} from '../src/index.js';
import {
  at,
  canSymlink,
  cleanupTempDirs,
  listTree,
  makeTree,
  tempDir,
  trySymlink,
} from './helpers.js';

afterAll(cleanupTempDirs);

/** A mod folder carrying every category of junk this tool knows about. */
function dirtyMod(): string {
  return makeTree({
    'Meta.ini': '[Miscellaneous]\nTitle=Test\n',
    'Resources/scripts/mission.lua': 'Game.SelectMission("m0")\n',
    'Resources/art/bench.p3d': 'pretend binary',
    // macOS
    '.DS_Store': 'finder',
    'Resources/.DS_Store': 'finder',
    'Resources/._bench.p3d': 'apple double',
    '__MACOSX/Resources/._bench.p3d': 'apple double',
    // editors
    '.mission.lua.swp': 'vim swap',
    '#notes.txt#': 'emacs autosave',
    '.#notes.txt': 'emacs lock',
    'notes.txt~': 'editor backup',
    // temporary
    'build.tmp': 'temp',
    'old.bak': 'backup',
    'patch.orig': 'merge leftover',
    // source that must survive
    '.gitignore': 'build/\n',
    '.editorconfig': 'root = true\n',
    'notes.txt': 'real notes',
  });
}

describe('junk classification', () => {
  it('recognises each category', () => {
    expect(classifyJunk('.DS_Store', false)?.kind).toBe('ds-store');
    expect(classifyJunk('._thing.p3d', false)?.kind).toBe('apple-double');
    expect(classifyJunk('__MACOSX', true)?.kind).toBe('macos-metadata');
    expect(classifyJunk('.mission.lua.swp', false)?.kind).toBe('editor-swap');
    expect(classifyJunk('build.tmp', false)?.kind).toBe('temporary');
  });

  it('leaves hidden source files alone', () => {
    // Being hidden is not evidence of being junk.
    for (const name of ['.gitignore', '.editorconfig', '.luarc.json', '.gitattributes']) {
      expect(classifyJunk(name, false), name).toBeUndefined();
    }
  });

  it('leaves ordinary mod files alone', () => {
    for (const name of ['Meta.ini', 'mission.lua', 'bench.p3d', 'notes.txt', 'CustomFiles.ini']) {
      expect(classifyJunk(name, false), name).toBeUndefined();
    }
  });

  it('does not treat __MACOSX as junk when it is a file rather than a folder', () => {
    expect(classifyJunk('__MACOSX', false)).toBeUndefined();
  });
});

describe('preview', () => {
  it('finds every junk category and writes nothing', () => {
    const root = dirtyMod();
    const before = listTree(root);

    const plan = planClean(root);
    const kinds = new Set(plan.junk.map((entry) => entry.kind));
    expect(kinds).toEqual(
      new Set(['ds-store', 'apple-double', 'macos-metadata', 'editor-swap', 'temporary']),
    );

    expect(listTree(root)).toEqual(before);
  });

  it('keeps source files, including hidden ones', () => {
    const plan = planClean(dirtyMod());
    const kept = plan.keep.map((file) => file.path);
    expect(kept).toContain('.gitignore');
    expect(kept).toContain('.editorconfig');
    expect(kept).toContain('Meta.ini');
    expect(kept).toContain('notes.txt');
    expect(kept).toContain('Resources/scripts/mission.lua');
  });

  it('reports a junk directory once, not file by file', () => {
    const plan = planClean(dirtyMod());
    const macosx = plan.junk.filter((entry) => entry.path.startsWith('__MACOSX'));
    expect(macosx).toHaveLength(1);
    expect(macosx[0]?.type).toBe('directory');
  });

  it('gives a plain-language reason for every item', () => {
    for (const entry of planClean(dirtyMod()).junk) {
      expect(entry.why.length, entry.path).toBeGreaterThan(0);
    }
  });
});

describe('clean export', () => {
  it('copies everything except junk and leaves the original untouched', () => {
    const source = dirtyMod();
    const before = listTree(source);
    const destination = path.join(tempDir(), 'export');

    const result = cleanExport({ source, destination });

    expect(listTree(source)).toEqual(before);
    const exported = listTree(destination);
    expect(exported).toEqual([
      '.editorconfig',
      '.gitignore',
      'Meta.ini',
      'Resources/art/bench.p3d',
      'Resources/scripts/mission.lua',
      'notes.txt',
    ]);
    expect(result.errors).toEqual([]);
  });

  it('copies file contents faithfully', () => {
    const source = makeTree({ 'a/b.txt': 'exact contents', '.DS_Store': 'junk' });
    const destination = path.join(tempDir(), 'export');
    cleanExport({ source, destination });

    expect(fs.readFileSync(path.join(destination, 'a', 'b.txt'), 'utf8')).toBe('exact contents');
  });

  it('refuses a destination inside the source', () => {
    const source = makeTree({ 'a.txt': 'a' });
    expect(() => cleanExport({ source, destination: at(source, 'export') })).toThrow(
      /inside the project folder/i,
    );
  });

  it('refuses a destination that contains the source', () => {
    const parent = tempDir();
    const source = path.join(parent, 'mod');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'a.txt'), 'a');

    expect(() => cleanExport({ source, destination: parent })).toThrow(/inside the export folder/i);
  });

  it('refuses a destination that already has files, unless forced', () => {
    const source = makeTree({ 'a.txt': 'a' });
    const destination = makeTree({ 'existing.txt': 'do not clobber me' });

    expect(() => cleanExport({ source, destination })).toThrow(/not empty/i);
    expect(fs.existsSync(at(destination, 'existing.txt'))).toBe(true);

    const result = cleanExport({ source, destination, force: true });
    expect(result.copied).toEqual(['a.txt']);
    // Forcing adds; it does not wipe.
    expect(fs.existsSync(at(destination, 'existing.txt'))).toBe(true);
  });

  it('accepts an empty destination that already exists', () => {
    const source = makeTree({ 'a.txt': 'a' });
    const destination = tempDir();
    expect(cleanExport({ source, destination }).copied).toEqual(['a.txt']);
  });
});

describe.skipIf(!canSymlink())('clean export and symbolic links', () => {
  it('recreates a link that points inside the project', () => {
    const source = makeTree({ 'real/file.txt': 'x' });
    trySymlink('real/file.txt', at(source, 'alias.txt'));

    const destination = path.join(tempDir(), 'export');
    const result = cleanExport({ source, destination });

    expect(result.linked).toEqual(['alias.txt']);
    expect(fs.lstatSync(path.join(destination, 'alias.txt')).isSymbolicLink()).toBe(true);
  });

  it('does not export a link pointing outside the project', () => {
    const outside = makeTree({ 'secret.txt': 'not yours' });
    const source = makeTree({ 'a.txt': 'a' });
    trySymlink(at(outside, 'secret.txt'), at(source, 'escape.txt'));

    const destination = path.join(tempDir(), 'export');
    const result = cleanExport({ source, destination });

    expect(result.linked).toEqual([]);
    expect(listTree(destination)).toEqual(['a.txt']);
    // And the outside file's contents were never copied anywhere.
    expect(fs.existsSync(path.join(destination, 'escape.txt'))).toBe(false);
    expect(result.plan.symlinks[0]?.reason).toMatch(/outside the project/);
  });

  it('does not export a broken link', () => {
    const source = makeTree({ 'a.txt': 'a' });
    trySymlink(at(source, 'gone.txt'), at(source, 'broken.txt'));

    const destination = path.join(tempDir(), 'export');
    expect(cleanExport({ source, destination }).linked).toEqual([]);
  });
});

describe('in-place deletion', () => {
  it('refuses without explicit confirmation', () => {
    const source = dirtyMod();
    const before = listTree(source);

    expect(() => cleanInPlace({ source, confirm: false })).toThrow(PocketToolError);
    expect(listTree(source)).toEqual(before);
  });

  it('removes only junk when confirmed', () => {
    const source = dirtyMod();
    const result = cleanInPlace({ source, confirm: true });

    expect(result.errors).toEqual([]);
    expect(listTree(source)).toEqual([
      '.editorconfig',
      '.gitignore',
      'Meta.ini',
      'Resources/art/bench.p3d',
      'Resources/scripts/mission.lua',
      'notes.txt',
    ]);
  });

  it('is idempotent', () => {
    const source = dirtyMod();
    cleanInPlace({ source, confirm: true });
    const after = listTree(source);

    const second = cleanInPlace({ source, confirm: true });
    expect(second.removed).toEqual([]);
    expect(listTree(source)).toEqual(after);
  });

  it.skipIf(!canSymlink())('refuses to delete a symlink even if it is named like junk', () => {
    const outside = makeTree({ 'important.txt': 'someone else data' });
    const source = makeTree({ 'a.txt': 'a' });
    // A link named .DS_Store pointing at a real file elsewhere: the exact case
    // where following the name rather than the type would destroy something.
    trySymlink(at(outside, 'important.txt'), at(source, '.DS_Store'));

    const result = cleanInPlace({ source, confirm: true });
    expect(result.removed).toEqual([]);
    expect(fs.existsSync(at(outside, 'important.txt'))).toBe(true);
  });
});
