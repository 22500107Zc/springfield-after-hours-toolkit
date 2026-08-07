import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  EXAMPLE_MISSION_PATH,
  StarterError,
  createStarterProject,
  internalNameFor,
  planStarterProject,
} from '../src/index.js';

const temporary: string[] = [];

function tempParent(): string {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sah-starter-')));
  temporary.push(directory);
  return directory;
}

afterAll(() => {
  while (temporary.length > 0) {
    const directory = temporary.pop();
    if (directory) fs.rmSync(directory, { recursive: true, force: true });
  }
});

const base = { projectName: 'Night Shift', author: 'Zach', includeExampleMission: true };

describe('the generated project', () => {
  it('contains the files a Mod Launcher mod needs', () => {
    const paths = planStarterProject(base).map((file) => file.path);
    expect(paths).toContain('Meta.ini');
    expect(paths).toContain('CustomFiles.ini');
    expect(paths).toContain('CustomFiles.lua');
    expect(paths).toContain('README.md');
    expect(paths).toContain(EXAMPLE_MISSION_PATH);
  });

  it('writes the documented Meta.ini keys and nothing invented', () => {
    const meta = planStarterProject(base).find((file) => file.path === 'Meta.ini')?.contents ?? '';

    expect(meta).toContain('[Miscellaneous]');
    expect(meta).toContain('Title=Night Shift');
    expect(meta).toContain('InternalName=NightShift');
    expect(meta).toContain('[Author]');
    expect(meta).toContain('Name=Zach');

    // Every key written must be one this project has a documented basis for.
    const keys = [...meta.matchAll(/^([A-Za-z]+)=/gm)].map((match) => match[1]);
    const documented = new Set([
      'Title',
      'InternalName',
      'Description',
      'Version',
      'Main',
      'SupportsEnglish',
      'SupportsDemo',
      'SupportsInternational',
      'SupportsBestSellerSeries',
      'Name',
      'Credits',
    ]);
    for (const key of keys) expect(documented.has(key ?? ''), `unexpected key ${key}`).toBe(true);
  });

  it('registers the example script with doubled backslashes', () => {
    const ini =
      planStarterProject(base).find((file) => file.path === 'CustomFiles.ini')?.contents ?? '';
    expect(ini).toContain('[PathHandlers]');
    expect(ini).toContain(
      'scripts\\\\missions\\\\level01\\\\m0i.mfk=Resources/scripts/example-mission.lua',
    );
  });

  it('labels the example mission as not game-verified, in the file itself', () => {
    const lua =
      planStarterProject(base).find((file) => file.path === EXAMPLE_MISSION_PATH)?.contents ?? '';
    expect(lua).toMatch(/AUTHORING EXAMPLE, NOT A GAME-VERIFIED MISSION/);
    expect(lua).toMatch(/NOT been loaded or/i);
  });

  it('separates preparing a mod from testing it, in the project README', () => {
    const readme =
      planStarterProject(base).find((file) => file.path === 'README.md')?.contents ?? '';
    expect(readme).toMatch(/cannot tell you whether/i);
    expect(readme).toMatch(/lawful copy of the game/i);
    // It must not claim to ship anyone else's files.
    expect(readme).toMatch(/Game\.lua/);
  });

  it('omits the example when it was not asked for', () => {
    const paths = planStarterProject({ ...base, includeExampleMission: false }).map((f) => f.path);
    expect(paths).not.toContain(EXAMPLE_MISSION_PATH);
  });
});

describe('determinism', () => {
  it('produces identical output for identical options', () => {
    expect(JSON.stringify(planStarterProject(base))).toBe(JSON.stringify(planStarterProject(base)));
  });

  it('carries no timestamp', () => {
    const all = planStarterProject(base)
      .map((file) => file.contents)
      .join('\n');
    expect(all).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
  });

  it('lists files in a stable order', () => {
    const paths = planStarterProject(base).map((file) => file.path);
    expect(paths).toEqual([...paths].sort());
  });
});

describe('internal names', () => {
  it('strips spaces and punctuation', () => {
    expect(internalNameFor('Night Shift')).toBe('NightShift');
    expect(internalNameFor("Krusty's Big Mod!")).toBe('KrustysBigMod');
  });

  it('folds accents rather than dropping the letters', () => {
    expect(internalNameFor('Niveau Spécial')).toBe('NiveauSpecial');
  });

  it('falls back rather than producing an empty key', () => {
    expect(internalNameFor('***')).toBe('MySharMod');
    expect(internalNameFor('🍩')).toBe('MySharMod');
  });
});

describe('writing to disk', () => {
  it('creates the project and its directories', () => {
    const root = path.join(tempParent(), 'my-mod');
    const result = createStarterProject({ ...base, destination: root });

    expect(fs.existsSync(path.join(root, 'Meta.ini'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'Resources', 'scripts'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'Resources', 'lib'))).toBe(true);
    expect(result.written).toContain('Meta.ini');
  });

  it('refuses a folder that already has files in it', () => {
    const root = path.join(tempParent(), 'occupied');
    fs.mkdirSync(root);
    fs.writeFileSync(path.join(root, 'important.txt'), 'do not lose me');

    expect(() => createStarterProject({ ...base, destination: root })).toThrow(StarterError);
    // The point of the refusal: the existing file is untouched.
    expect(fs.readFileSync(path.join(root, 'important.txt'), 'utf8')).toBe('do not lose me');
    expect(fs.existsSync(path.join(root, 'Meta.ini'))).toBe(false);
  });

  it('accepts an existing but empty folder', () => {
    const root = path.join(tempParent(), 'empty');
    fs.mkdirSync(root);
    expect(() => createStarterProject({ ...base, destination: root })).not.toThrow();
  });

  it('refuses when a file is already at that path', () => {
    const root = path.join(tempParent(), 'a-file');
    fs.writeFileSync(root, 'x');
    expect(() => createStarterProject({ ...base, destination: root })).toThrow(/already a file/i);
  });

  it('refuses when the containing folder does not exist', () => {
    const root = path.join(tempParent(), 'missing', 'deeper', 'mod');
    expect(() => createStarterProject({ ...base, destination: root })).toThrow(/does not exist/i);
  });

  it('says nothing was changed when it refuses', () => {
    const root = path.join(tempParent(), 'occupied2');
    fs.mkdirSync(root);
    fs.writeFileSync(path.join(root, 'x.txt'), 'x');
    try {
      createStarterProject({ ...base, destination: root });
      throw new Error('should have refused');
    } catch (error) {
      expect(error).toBeInstanceOf(StarterError);
      expect((error as StarterError).nothingChanged).toBe(true);
    }
  });
});

describe('awkward names and paths', () => {
  it('handles spaces, apostrophes and Unicode in the project name', () => {
    const root = path.join(tempParent(), 'awkward');
    const result = createStarterProject({
      destination: root,
      projectName: "Krusty's Niveau Spécial 🍩",
      author: "Zach O'Brien",
      includeExampleMission: true,
    });

    const meta = fs.readFileSync(path.join(result.root, 'Meta.ini'), 'utf8');
    expect(meta).toContain("Title=Krusty's Niveau Spécial 🍩");
    expect(meta).toContain("Name=Zach O'Brien");
    // The identifier is derived, so it stays a legal identifier.
    expect(meta).toContain('InternalName=KrustysNiveauSpecial');
  });

  it('handles spaces, apostrophes and Unicode in the destination path', () => {
    const root = path.join(tempParent(), "Krusty's Mods", 'niveau spécial 🍩');
    fs.mkdirSync(path.dirname(root), { recursive: true });

    const result = createStarterProject({ ...base, destination: root });
    expect(fs.existsSync(path.join(result.root, 'Meta.ini'))).toBe(true);
  });
});
