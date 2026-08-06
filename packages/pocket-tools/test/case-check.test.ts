import { afterAll, describe, expect, it } from 'vitest';
import { checkCase, findPathCollisions, matchSeparatorStyle } from '../src/index.js';
import {
  at,
  caseSensitiveFs,
  cleanupTempDirs,
  makeTree,
  trySymlink,
  canSymlink,
} from './helpers.js';

afterAll(cleanupTempDirs);

describe('collision detection (host-independent)', () => {
  // Runs everywhere: macOS and Windows cannot hold two colliding names at once,
  // so the interesting input is built in memory rather than on disk.
  it('groups paths that differ only by case', () => {
    const collisions = findPathCollisions(['Scripts/Main.lua', 'scripts/main.lua', 'Meta.ini']);
    expect(collisions).toHaveLength(1);
    expect(collisions[0]?.lowercased).toBe('scripts/main.lua');
    expect(collisions[0]?.paths).toEqual(['Scripts/Main.lua', 'scripts/main.lua']);
  });

  it('does not group paths that merely share a name in different folders', () => {
    expect(findPathCollisions(['a/main.lua', 'b/main.lua'])).toEqual([]);
  });

  it('reports nothing for identical repeated paths', () => {
    expect(findPathCollisions(['a.txt', 'a.txt'])).toEqual([]);
  });

  it('groups three-way collisions once', () => {
    const collisions = findPathCollisions(['A.TXT', 'a.txt', 'A.txt']);
    expect(collisions).toHaveLength(1);
    expect(collisions[0]?.paths).toEqual(['A.TXT', 'A.txt', 'a.txt']);
  });
});

describe.skipIf(!caseSensitiveFs())('collision detection on a case-sensitive filesystem', () => {
  it('finds colliding files that really exist side by side', () => {
    const root = makeTree({
      'Scripts/Main.lua': 'a',
      'scripts/main.lua': 'b',
    });
    const result = checkCase({ root, checkReferences: false });

    expect(result.ok).toBe(false);
    const files = result.collisions.filter((collision) => collision.type === 'file');
    const directories = result.collisions.filter((collision) => collision.type === 'directory');
    expect(files).toHaveLength(1);
    expect(directories).toHaveLength(1);
    expect(directories[0]?.paths).toEqual(['Scripts', 'scripts']);
  });
});

describe('mis-cased references', () => {
  // These need only ONE real file, so they run identically on every host.
  it('reports a reference whose casing does not match the real file', () => {
    const root = makeTree({
      'resources/scripts/mission.lua': '-- the real file',
      'CustomFiles.ini': '[PathHandlers]\nscripts\\\\m0i.mfk=Resources/Scripts/Mission.lua\n',
    });

    const result = checkCase({ root });
    expect(result.ok).toBe(false);
    expect(result.references).toHaveLength(1);

    const reference = result.references[0];
    expect(reference?.file).toBe('CustomFiles.ini');
    expect(reference?.line).toBe(2);
    expect(reference?.referenced).toBe('Resources/Scripts/Mission.lua');
    expect(reference?.actual).toBe('resources/scripts/mission.lua');
    expect(reference?.suggestion).toBe('resources/scripts/mission.lua');
  });

  it('says nothing when the casing is already correct', () => {
    const root = makeTree({
      'resources/scripts/mission.lua': '-- real',
      'CustomFiles.ini': '[PathHandlers]\nx=resources/scripts/mission.lua\n',
    });
    expect(checkCase({ root }).ok).toBe(true);
  });

  it('keeps backslashes in the suggestion when the file used backslashes', () => {
    const root = makeTree({
      'art/props/bench.p3d': 'binary-ish',
      'level.mfk': 'AddProp("Art\\Props\\Bench.p3d");\n',
    });

    const result = checkCase({ root });
    expect(result.references[0]?.suggestion).toBe('art\\props\\bench.p3d');
  });

  it('understands a leading ./ and a leading slash', () => {
    const root = makeTree({
      'scripts/a.lua': 'x',
      'notes.txt': './Scripts/A.lua\n/Scripts/A.lua\n',
    });
    const result = checkCase({ root });
    expect(result.references).toHaveLength(2);
    expect(result.references.every((reference) => reference.actual === 'scripts/a.lua')).toBe(true);
  });

  it('finds a directory reference, not only a file reference', () => {
    const root = makeTree({
      'resources/scripts/a.lua': 'x',
      'notes.txt': 'everything lives in Resources/Scripts/ these days\n',
    });
    const result = checkCase({ root });
    expect(result.references.map((reference) => reference.actual)).toContain('resources/scripts');
  });

  it('does not read file types it has no business reading', () => {
    const root = makeTree({
      'art/thing.p3d': 'Art/Thing.P3D',
      'a.lua': '-- nothing here',
    });
    // The .p3d contains a mis-cased reference to itself, but .p3d is binary
    // game data and is never opened.
    expect(checkCase({ root }).references).toEqual([]);
  });

  it('skips a file that claims to be text but contains binary data', () => {
    const root = makeTree({
      'scripts/a.lua': 'x',
      'broken.txt': `Scripts/A.lua\u0000\u0001binary`,
    });
    const result = checkCase({ root });
    expect(result.references).toEqual([]);
    expect(result.skipped.map((entry) => entry.path)).toContain('broken.txt');
  });
});

describe('false-positive resistance', () => {
  it('says nothing at all about ordinary English prose', () => {
    const root = makeTree({
      'scripts/main.lua': 'x',
      'README.txt': [
        'Springfield After Hours is a campaign for The Simpsons: Hit and Run.',
        'Install it with the Mod Launcher. Bart, Lisa, Homer and Marge all appear.',
        'Version 1.0. Contact me at example.com or on the forums.',
        'It is 100% not affiliated with anybody. Enjoy!',
      ].join('\n'),
    });

    const result = checkCase({ root });
    expect(result.references).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('ignores a word that happens to match a filename with different case', () => {
    // "main" is a real word AND half of a real filename. Without the
    // separator-or-extension rule this would be reported.
    const root = makeTree({
      main: 'x',
      'notes.txt': 'The Main thing to remember is to test the Main path.\n',
    });
    expect(checkCase({ root }).references).toEqual([]);
  });

  it('ignores references to files that do not exist under any casing', () => {
    const root = makeTree({
      'a.lua': 'x',
      'notes.txt': 'see Resources/Scripts/DoesNotExist.lua for details\n',
    });
    // Not a case problem. This tool refuses to guess about missing files.
    expect(checkCase({ root }).references).toEqual([]);
  });

  it('ignores URLs', () => {
    const root = makeTree({
      'docs/readme.txt': 'x',
      'notes.txt': 'see https://example.com/Docs/Readme.txt for details\n',
    });
    expect(checkCase({ root }).references).toEqual([]);
  });

  it('ignores commented-out lines', () => {
    const root = makeTree({
      'scripts/a.lua': 'x',
      'mod.lua': '-- dofile("Scripts/A.lua")\ndofile("scripts/a.lua")\n',
      'mod.ini': '; Scripts/A.lua\n',
    });
    expect(checkCase({ root }).references).toEqual([]);
  });

  it('ignores a Windows absolute path, which is not a project reference', () => {
    const root = makeTree({
      'scripts/a.lua': 'x',
      'notes.txt': 'C:\\Games\\Scripts\\A.lua\n',
    });
    expect(checkCase({ root }).references).toEqual([]);
  });
});

describe('reporting', () => {
  it('changes nothing on disk', () => {
    const root = makeTree({
      'resources/a.lua': 'original',
      'x.ini': 'k=Resources/A.lua\n',
    });
    checkCase({ root });

    // Both files still exactly as written.
    expect(checkCase({ root }).references).toHaveLength(1);
    expect(checkCase({ root }).filesScanned).toBe(2);
  });

  it('counts the text files it actually read', () => {
    const root = makeTree({ 'a.lua': 'x', 'b.p3d': 'x', 'c.ini': 'x' });
    expect(checkCase({ root }).textFilesRead).toBe(2);
  });

  it.skipIf(!canSymlink())('notes symbolic links instead of following them', () => {
    const root = makeTree({ 'a.lua': 'x' });
    trySymlink(at(root, 'a.lua'), at(root, 'link.lua'));

    const result = checkCase({ root });
    expect(result.skipped.map((entry) => entry.path)).toContain('link.lua');
  });
});

describe('matchSeparatorStyle', () => {
  it('uses backslashes when the original did', () => {
    expect(matchSeparatorStyle('Art\\Bench.p3d', 'art/bench.p3d')).toBe('art\\bench.p3d');
  });

  it('keeps forward slashes otherwise', () => {
    expect(matchSeparatorStyle('Art/Bench.p3d', 'art/bench.p3d')).toBe('art/bench.p3d');
  });

  it('preserves a leading ./', () => {
    expect(matchSeparatorStyle('./Art/Bench.p3d', 'art/bench.p3d')).toBe('./art/bench.p3d');
  });
});
