import { describe, expect, it } from 'vitest';
import {
  commentMarkersFor,
  extractReferences,
  isScannableFile,
  looksLikePath,
  normaliseReference,
} from '../src/index.js';

/**
 * The reference scanner's job is to be *narrow*. These tests are mostly about
 * what it refuses to call a path, because a tool that flags every English word
 * is worse than no tool.
 */

describe('looksLikePath', () => {
  it('accepts anything with a separator', () => {
    expect(looksLikePath('a/b')).toBe(true);
    expect(looksLikePath('Resources\\scripts')).toBe(true);
  });

  it('accepts a bare filename with a known extension', () => {
    expect(looksLikePath('mission.lua')).toBe(true);
    expect(looksLikePath('Meta.ini')).toBe(true);
    expect(looksLikePath('bench.p3d')).toBe(true);
  });

  it('rejects ordinary words', () => {
    for (const word of ['Springfield', 'the', 'Bart', 'mission', 'Homer', 'Launcher']) {
      expect(looksLikePath(word), word).toBe(false);
    }
  });

  it('rejects an unknown extension', () => {
    expect(looksLikePath('something.xyz')).toBe(false);
  });

  it('rejects URLs', () => {
    expect(looksLikePath('https://example.com/a/b')).toBe(false);
    expect(looksLikePath('ftp://host/file.lua')).toBe(false);
  });

  it('rejects things too short or absurdly long', () => {
    expect(looksLikePath('a')).toBe(false);
    expect(looksLikePath(`${'a/'.repeat(400)}b`)).toBe(false);
  });
});

describe('extractReferences', () => {
  it('finds a quoted path and reports its position', () => {
    const found = extractReferences('dofile("Resources/lib/Game.lua")\n');
    expect(found).toHaveLength(1);
    expect(found[0]?.raw).toBe('Resources/lib/Game.lua');
    expect(found[0]?.line).toBe(1);
  });

  it('finds a path on the right of an INI assignment', () => {
    const found = extractReferences('scripts\\\\m0i.mfk=Resources/scripts/m0i.lua\n');
    expect(found.map((entry) => entry.raw)).toContain('Resources/scripts/m0i.lua');
  });

  it('reports the line number of a later line', () => {
    const found = extractReferences('nothing here\nstill nothing\nart/bench.p3d\n');
    expect(found[0]?.line).toBe(3);
  });

  it('finds nothing in ordinary prose', () => {
    const prose = [
      'Springfield After Hours is a campaign for The Simpsons: Hit and Run.',
      'Install it using the Mod Launcher and enjoy. Not affiliated with anyone.',
      'Thanks to everyone who tested it, especially Bart and Lisa.',
    ].join('\n');
    expect(extractReferences(prose)).toEqual([]);
  });

  it('skips lines that are comments in that file type', () => {
    const lua = '-- Resources/old.lua\ndofile("Resources/new.lua")\n';
    const found = extractReferences(lua, { commentMarkers: commentMarkersFor('mod.lua') });
    expect(found.map((entry) => entry.raw)).toEqual(['Resources/new.lua']);
  });

  it('strips punctuation a sentence leaves attached', () => {
    const found = extractReferences('Edit the file at Resources/a.lua, then rebuild.\n');
    expect(found[0]?.raw).toBe('Resources/a.lua');
  });
});

describe('commentMarkersFor', () => {
  it('knows each format', () => {
    expect(commentMarkersFor('mod.lua')).toEqual(['--']);
    expect(commentMarkersFor('Meta.ini')).toEqual([';', '#']);
    expect(commentMarkersFor('level.mfk')).toEqual(['//', '#']);
    expect(commentMarkersFor('campaign.yaml')).toEqual(['#']);
  });

  it('assumes nothing for a plain text file', () => {
    expect(commentMarkersFor('readme.txt')).toEqual([]);
  });
});

describe('normaliseReference', () => {
  it('unifies separators', () => {
    expect(normaliseReference('Resources\\scripts\\a.lua')).toBe('Resources/scripts/a.lua');
  });

  it('drops a leading ./ and leading slashes', () => {
    expect(normaliseReference('./a/b.lua')).toBe('a/b.lua');
    expect(normaliseReference('/a/b.lua')).toBe('a/b.lua');
  });

  it('drops a trailing slash, which names the same folder', () => {
    expect(normaliseReference('Resources/scripts/')).toBe('Resources/scripts');
  });

  it('refuses a reference that climbs out of the project', () => {
    expect(normaliseReference('../elsewhere/a.lua')).toBeUndefined();
    expect(normaliseReference('a/../../b.lua')).toBeUndefined();
  });

  it('refuses a Windows absolute path', () => {
    expect(normaliseReference('C:\\Games\\a.lua')).toBeUndefined();
  });

  it('refuses an empty reference', () => {
    expect(normaliseReference('   ')).toBeUndefined();
    expect(normaliseReference('/')).toBeUndefined();
  });
});

describe('which files get read', () => {
  it('reads the documented plain-text formats', () => {
    for (const name of ['a.ini', 'a.lua', 'a.mfk', 'a.con', 'a.txt', 'a.json', 'a.yaml', 'a.yml']) {
      expect(isScannableFile(name), name).toBe(true);
    }
  });

  it('does not read binary game data', () => {
    for (const name of ['a.p3d', 'a.rcf', 'a.wav', 'a.png', 'a.exe']) {
      expect(isScannableFile(name), name).toBe(false);
    }
  });

  it('matches the extension case-insensitively', () => {
    expect(isScannableFile('META.INI')).toBe(true);
  });
});
