import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  GAME_DEFINITIONS_DIRECTORY,
  LUA_RUNTIME_VERSION,
  OFFICIAL_DEFINITIONS_DIRECTORY,
  applyInstall,
  mergeVsCodeSettings,
  officialDependency,
  planInstall,
} from '../src/index.js';

/**
 * `install` is the only code here that writes into someone else's project, so
 * these tests are mostly about what it REFUSES to do.
 *
 * No test touches the network: downloads are injected.
 */

const DEFINITIONS = '---@meta\n-- test definitions\nGame = Game or {}\n';
const temporary: string[] = [];

function project(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sah-modproject-'));
  temporary.push(directory);
  return directory;
}

function readJson(file: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
}

afterEach(() => {
  while (temporary.length > 0) {
    const directory = temporary.pop();
    if (directory) fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('settings merge', () => {
  it('creates settings when a project has none', () => {
    const { merged, changed, notes } = mergeVsCodeSettings({}, ['libA']);
    expect(changed).toBe(true);
    expect(merged['Lua.runtime.version']).toBe(LUA_RUNTIME_VERSION);
    expect(merged['Lua.workspace.library']).toEqual(['libA']);
    expect(notes.join(' ')).toContain('Lua.runtime.version');
  });

  it('preserves unrelated settings untouched', () => {
    const existing = {
      'editor.tabSize': 2,
      'files.exclude': { '**/.git': true },
      'someExtension.custom': ['a', 'b'],
    };
    const { merged } = mergeVsCodeSettings(existing, ['libA']);
    expect(merged['editor.tabSize']).toBe(2);
    expect(merged['files.exclude']).toEqual({ '**/.git': true });
    expect(merged['someExtension.custom']).toEqual(['a', 'b']);
  });

  it('unions the library list instead of replacing it', () => {
    const { merged } = mergeVsCodeSettings({ 'Lua.workspace.library': ['mine/stubs'] }, ['libA']);
    expect(merged['Lua.workspace.library']).toEqual(['mine/stubs', 'libA']);
  });

  it('does not add a library twice, and reports nothing to change', () => {
    // Fully configured already, so a re-run must be a no-op.
    const { merged, changed } = mergeVsCodeSettings(
      { 'Lua.runtime.version': LUA_RUNTIME_VERSION, 'Lua.workspace.library': ['libA'] },
      ['libA'],
    );
    expect(merged['Lua.workspace.library']).toEqual(['libA']);
    expect(changed).toBe(false);
  });

  it('never silently retargets a runtime the author already chose', () => {
    const { merged, notes } = mergeVsCodeSettings({ 'Lua.runtime.version': 'Lua 5.4' }, ['libA']);
    expect(merged['Lua.runtime.version']).toBe('Lua 5.4');
    expect(notes.join(' ')).toContain('left Lua.runtime.version');
  });
});

describe('planning', () => {
  it('writes nothing when only planning', async () => {
    const root = project();
    const plan = await planInstall({
      projectRoot: root,
      definitions: DEFINITIONS,
      withOfficial: false,
    });

    expect(plan.errors).toEqual([]);
    expect(fs.existsSync(path.join(root, GAME_DEFINITIONS_DIRECTORY))).toBe(false);
    expect(fs.existsSync(path.join(root, '.vscode'))).toBe(false);
    expect(plan.files.map((f) => f.path)).toContain(`${GAME_DEFINITIONS_DIRECTORY}/Game.meta.lua`);
  });

  it('warns when the official definitions are skipped', async () => {
    const plan = await planInstall({
      projectRoot: project(),
      definitions: DEFINITIONS,
      withOfficial: false,
    });
    expect(plan.warnings.join(' ')).toContain('official');
  });

  it('refuses a project directory that does not exist', async () => {
    const plan = await planInstall({
      projectRoot: path.join(os.tmpdir(), 'sah-definitely-not-here-98765'),
      definitions: DEFINITIONS,
      withOfficial: false,
    });
    expect(plan.errors.join(' ')).toContain('does not exist');
  });

  it('refuses a file where a directory is required', async () => {
    const root = project();
    const file = path.join(root, 'a-file');
    fs.writeFileSync(file, 'x');
    const plan = await planInstall({
      projectRoot: file,
      definitions: DEFINITIONS,
      withOfficial: false,
    });
    expect(plan.errors.join(' ')).toContain('Not a directory');
  });

  it('reports unchanged when run twice', async () => {
    const root = project();
    const first = await planInstall({
      projectRoot: root,
      definitions: DEFINITIONS,
      withOfficial: false,
    });
    applyInstall(first);

    const second = await planInstall({
      projectRoot: root,
      definitions: DEFINITIONS,
      withOfficial: false,
    });
    expect(second.upToDate).toBe(true);
    expect(second.files.every((f) => f.action === 'unchanged')).toBe(true);
  });
});

describe('applying', () => {
  it('installs definitions and configures the editor', async () => {
    const root = project();
    const plan = await planInstall({
      projectRoot: root,
      definitions: DEFINITIONS,
      withOfficial: false,
    });
    const applied = applyInstall(plan);

    expect(applied.written).toContain(`${GAME_DEFINITIONS_DIRECTORY}/Game.meta.lua`);
    expect(
      fs.readFileSync(path.join(root, GAME_DEFINITIONS_DIRECTORY, 'Game.meta.lua'), 'utf8'),
    ).toBe(DEFINITIONS);

    const settings = readJson(path.join(root, '.vscode', 'settings.json'));
    expect(settings['Lua.runtime.version']).toBe(LUA_RUNTIME_VERSION);
    expect(settings['Lua.workspace.library']).toEqual([GAME_DEFINITIONS_DIRECTORY]);
  });

  it('preserves an existing settings file', async () => {
    const root = project();
    fs.mkdirSync(path.join(root, '.vscode'));
    fs.writeFileSync(
      path.join(root, '.vscode', 'settings.json'),
      JSON.stringify({ 'editor.formatOnSave': true, 'Lua.workspace.library': ['mine'] }, null, 2),
    );

    const plan = await planInstall({
      projectRoot: root,
      definitions: DEFINITIONS,
      withOfficial: false,
    });
    applyInstall(plan);

    const settings = readJson(path.join(root, '.vscode', 'settings.json'));
    expect(settings['editor.formatOnSave']).toBe(true);
    expect(settings['Lua.workspace.library']).toEqual(['mine', GAME_DEFINITIONS_DIRECTORY]);
  });

  it('refuses to touch a malformed settings file', async () => {
    const root = project();
    fs.mkdirSync(path.join(root, '.vscode'));
    const settingsPath = path.join(root, '.vscode', 'settings.json');
    fs.writeFileSync(settingsPath, '{ this is not json');

    const plan = await planInstall({
      projectRoot: root,
      definitions: DEFINITIONS,
      withOfficial: false,
    });

    expect(plan.errors.join(' ')).toContain('not a JSON object');
    expect(() => applyInstall(plan)).toThrow(/Refusing to apply/);
    expect(fs.readFileSync(settingsPath, 'utf8')).toBe('{ this is not json');
  });

  it('writes LF line endings regardless of host platform', async () => {
    const root = project();
    const plan = await planInstall({
      projectRoot: root,
      definitions: DEFINITIONS,
      withOfficial: false,
    });
    applyInstall(plan);

    const settings = fs.readFileSync(path.join(root, '.vscode', 'settings.json'), 'utf8');
    expect(settings).not.toContain('\r');
    expect(settings.endsWith('\n')).toBe(true);
  });
});

describe('official definitions', () => {
  it('verifies each file against its pinned hash before writing it', async () => {
    const dependency = officialDependency();
    expect(dependency.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(dependency.files.length).toBeGreaterThan(0);

    const plan = await planInstall({
      projectRoot: project(),
      definitions: DEFINITIONS,
      withOfficial: true,
      // Serve deliberately wrong bytes for every file.
      download: async () => Buffer.from('tampered'),
    });

    expect(plan.errors.length).toBeGreaterThan(0);
    expect(plan.errors.join(' ')).toContain('Hash mismatch');
    expect(plan.errors.join(' ')).toContain('Refusing to install');
  });

  it('installs official files that match their pinned hash', async () => {
    const root = project();
    const dependency = officialDependency();

    // Serve the real bytes from this repository's fetched copy.
    const vendored = path.resolve(
      new URL('../../../vendor/donutteam/lucas-mod-launcher-lua', import.meta.url).pathname,
    );
    if (!fs.existsSync(vendored)) {
      // Upstream has not been fetched in this environment; the hash-mismatch
      // test above already covers the security-relevant path.
      return;
    }

    const plan = await planInstall({
      projectRoot: root,
      definitions: DEFINITIONS,
      withOfficial: true,
      officialSourceDirectory: vendored,
    });

    expect(plan.errors).toEqual([]);
    applyInstall(plan);

    expect(
      fs.existsSync(path.join(root, OFFICIAL_DEFINITIONS_DIRECTORY, 'LuaTables.meta.lua')),
    ).toBe(true);
    // The licence must travel with the files it covers.
    expect(fs.existsSync(path.join(root, OFFICIAL_DEFINITIONS_DIRECTORY, 'LICENSE.md'))).toBe(true);

    const settings = readJson(path.join(root, '.vscode', 'settings.json'));
    expect(settings['Lua.workspace.library']).toEqual([
      GAME_DEFINITIONS_DIRECTORY,
      OFFICIAL_DEFINITIONS_DIRECTORY,
    ]);
    expect(dependency.license).toBe('MIT');
  });

  it('fails clearly when offline rather than installing a partial set', async () => {
    const plan = await planInstall({
      projectRoot: project(),
      definitions: DEFINITIONS,
      withOfficial: true,
      download: async () => {
        throw new Error('getaddrinfo ENOTFOUND raw.githubusercontent.com');
      },
    });

    expect(plan.errors.length).toBeGreaterThan(0);
    expect(plan.errors.join(' ')).toContain('Refusing to install an incomplete definition set');
    expect(() => applyInstall(plan)).toThrow();
  });

  it('refuses to install without a source when official files are requested', async () => {
    const plan = await planInstall({
      projectRoot: project(),
      definitions: DEFINITIONS,
      withOfficial: true,
    });
    expect(plan.errors.join(' ')).toContain('no downloader was provided');
  });
});
