import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable, Writable } from 'node:stream';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXIT_CODES } from '@sah/core';
import { runCli } from '../src/program.js';
import { runStart } from '../src/commands/start.js';
import { runToolsMenu } from '../src/commands/tools-menu.js';
import { stripQuotes } from '../src/commands/tools-menu.js';
import { askMenu, askText, askYesNo } from '../src/prompt.js';

/**
 * The beginner surface, driven the way a person drives it.
 *
 * Answers are piped into the same prompt code a keyboard feeds, so these tests
 * exercise the real interactive path rather than a bypass built for testing.
 */

const temporary: string[] = [];

function tempDir(): string {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sah-beginner-')));
  temporary.push(directory);
  return directory;
}

/** An IO pair whose input is a fixed script of answers. */
function scriptedIO(answers: string[]): {
  io: { input: Readable; output: Writable };
  text: () => string;
} {
  const chunks: string[] = [];
  const input = Readable.from([`${answers.join('\n')}\n`]);
  const output = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(String(chunk));
      callback();
    },
  });
  return { io: { input, output }, text: () => chunks.join('') };
}

let stdout: string[];
beforeEach(() => {
  stdout = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
    stdout.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});
afterEach(() => vi.restoreAllMocks());

afterAll(() => {
  while (temporary.length > 0) {
    const directory = temporary.pop();
    if (directory) fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('sah --version', () => {
  it('reports 0.1.1', async () => {
    const code = await runCli(['--version']);
    expect(code).toBe(EXIT_CODES.OK);
    expect(stdout.join('')).toContain('0.1.1');
  });
});

describe('sah help', () => {
  it('tells a newcomer exactly what to type first', async () => {
    expect(await runCli(['help'])).toBe(EXIT_CODES.OK);
    const text = stdout.join('');
    expect(text).toContain('sah start');
    expect(text).toContain('sah tools');
  });

  it('says plainly that it cannot test a mod in the game', async () => {
    await runCli(['help']);
    const text = stdout.join('');
    expect(text).toMatch(/cannot tell you whether your mod works/i);
    expect(text).toMatch(/does not include the game/i);
  });
});

describe('sah start, answered interactively', () => {
  it('creates a project from piped answers', async () => {
    const parent = tempDir();
    const destination = path.join(parent, 'my-first-mod');

    // name, author, folder, example?, definitions?, official?, confirm
    const { io, text } = scriptedIO(['Night Shift', 'Zach', destination, 'y', 'n', 'y']);
    const code = await runStart({ yes: false, debug: false, io });

    expect(code).toBe(EXIT_CODES.OK);
    expect(fs.existsSync(path.join(destination, 'Meta.ini'))).toBe(true);
    expect(fs.readFileSync(path.join(destination, 'Meta.ini'), 'utf8')).toContain(
      'Title=Night Shift',
    );
    expect(text()).toContain('Here is exactly what will happen');
  });

  it('shows the preview before writing anything', async () => {
    const parent = tempDir();
    const destination = path.join(parent, 'previewed');

    // Answer "n" to the final confirmation.
    const { io, text } = scriptedIO(['Preview Test', 'Zach', destination, 'y', 'n', 'n']);
    const code = await runStart({ yes: false, debug: false, io });

    expect(code).toBe(EXIT_CODES.OK);
    expect(text()).toContain('Files to be created:');
    expect(text()).toContain('Meta.ini');
    // Declined, so nothing exists.
    expect(fs.existsSync(destination)).toBe(false);
    expect(text()).toContain('Nothing was created');
  });

  it('never overwrites an existing folder', async () => {
    const parent = tempDir();
    const destination = path.join(parent, 'occupied');
    fs.mkdirSync(destination);
    fs.writeFileSync(path.join(destination, 'mine.txt'), 'keep me');

    const { io, text } = scriptedIO(['Clash', 'Zach', destination, 'y', 'n', 'y']);
    const code = await runStart({ yes: false, debug: false, io });

    expect(code).toBe(EXIT_CODES.REFUSED_OVERWRITE);
    expect(fs.readFileSync(path.join(destination, 'mine.txt'), 'utf8')).toBe('keep me');
    expect(fs.existsSync(path.join(destination, 'Meta.ini'))).toBe(false);
    expect(text()).toMatch(/Nothing was changed/);
  });

  it('is deterministic: two runs produce identical files', async () => {
    const parent = tempDir();
    const first = path.join(parent, 'one');
    const second = path.join(parent, 'two');

    await runStart({
      name: 'Same Mod',
      author: 'Zach',
      destination: first,
      yes: true,
      debug: false,
      io: scriptedIO([]).io,
    });
    await runStart({
      name: 'Same Mod',
      author: 'Zach',
      destination: second,
      yes: true,
      debug: false,
      io: scriptedIO([]).io,
    });

    for (const file of ['Meta.ini', 'CustomFiles.ini', 'README.md']) {
      expect(fs.readFileSync(path.join(first, file), 'utf8')).toBe(
        fs.readFileSync(path.join(second, file), 'utf8'),
      );
    }
  });

  it('handles spaces, apostrophes and Unicode in the destination', async () => {
    const parent = tempDir();
    const destination = path.join(parent, "Krusty's Mods", 'niveau spécial 🍩');
    fs.mkdirSync(path.dirname(destination), { recursive: true });

    const code = await runStart({
      name: "Krusty's Spécial",
      author: 'Zach',
      destination,
      yes: true,
      debug: false,
      io: scriptedIO([]).io,
    });

    expect(code).toBe(EXIT_CODES.OK);
    expect(fs.existsSync(path.join(destination, 'Meta.ini'))).toBe(true);
  });

  it('installs Game.* definitions into the new project', async () => {
    const parent = tempDir();
    const destination = path.join(parent, 'with-definitions');

    await runStart({
      name: 'Defs',
      author: 'Zach',
      destination,
      yes: true,
      debug: false,
      io: scriptedIO([]).io,
    });

    const definitions = path.join(
      destination,
      'Resources',
      'lib',
      'external',
      'sah-game-lua-definitions',
      'Game.meta.lua',
    );
    expect(fs.existsSync(definitions)).toBe(true);
    expect(fs.readFileSync(definitions, 'utf8')).toContain('function Game.AddStage');

    const settings = JSON.parse(
      fs.readFileSync(path.join(destination, '.vscode', 'settings.json'), 'utf8'),
    ) as Record<string, unknown>;
    expect(settings['Lua.runtime.version']).toBe('Lua 5.3');
  });

  it('cancels cleanly when input ends early', async () => {
    const { io, text } = scriptedIO([]);
    const code = await runStart({ yes: false, debug: false, io });
    expect(code).toBe(EXIT_CODES.OK);
    expect(text()).toContain('Cancelled');
  });
});

describe('sah tools, as a menu', () => {
  /** Builds a small mod folder to point the tools at. */
  function modFolder(name: string): string {
    const root = path.join(tempDir(), name);
    fs.mkdirSync(path.join(root, 'Resources'), { recursive: true });
    fs.writeFileSync(path.join(root, 'Meta.ini'), '[Miscellaneous]\nTitle=T\n');
    fs.writeFileSync(path.join(root, 'Resources', 'a.lua'), 'x');
    fs.writeFileSync(path.join(root, '.DS_Store'), 'junk');
    return root;
  }

  it('option 1 runs the capitalization check', async () => {
    const mod = modFolder('case');
    const { io } = scriptedIO(['1', mod]);
    const code = await runToolsMenu({ debug: false, io });
    expect([EXIT_CODES.OK, EXIT_CODES.VALIDATION_FAILED]).toContain(code);
    expect(stdout.join('')).toContain('Checked');
  });

  it('option 2 makes a clean copy and leaves the original alone', async () => {
    const mod = modFolder('clean');
    const destination = path.join(tempDir(), 'exported');

    const { io } = scriptedIO(['2', mod, destination]);
    expect(await runToolsMenu({ debug: false, io })).toBe(EXIT_CODES.OK);

    expect(fs.existsSync(path.join(destination, 'Meta.ini'))).toBe(true);
    expect(fs.existsSync(path.join(destination, '.DS_Store'))).toBe(false);
    // The original keeps its junk: this tool copies, it does not clean in place.
    expect(fs.existsSync(path.join(mod, '.DS_Store'))).toBe(true);
  });

  it('option 3 compares two mods', async () => {
    const { io } = scriptedIO(['3', modFolder('a'), modFolder('b')]);
    const code = await runToolsMenu({ debug: false, io });
    expect([EXIT_CODES.OK, EXIT_CODES.VALIDATION_FAILED]).toContain(code);
    expect(stdout.join('')).toMatch(/Compared 2 mods/);
  });

  it('option 4 writes a manifest', async () => {
    const mod = modFolder('manifest');
    const { io } = scriptedIO(['4', mod, 'y']);
    expect(await runToolsMenu({ debug: false, io })).toBe(EXIT_CODES.OK);
    expect(fs.existsSync(path.join(mod, 'manifest.json'))).toBe(true);
  });

  it('option 5 compares two releases', async () => {
    const { io } = scriptedIO(['5', modFolder('v1'), modFolder('v2')]);
    const code = await runToolsMenu({ debug: false, io });
    expect([EXIT_CODES.OK, EXIT_CODES.VALIDATION_FAILED]).toContain(code);
  });

  it('option 6 converts a path', async () => {
    const mod = modFolder('paths');
    const { io } = scriptedIO(['6', mod, 'Resources/a.lua']);
    expect(await runToolsMenu({ debug: false, io })).toBe(EXIT_CODES.OK);
    expect(stdout.join('')).toContain('Resources\\a.lua');
  });

  it('re-asks rather than crashing on a bad menu number', async () => {
    const mod = modFolder('retry');
    const { io, text } = scriptedIO(['99', '1', mod]);
    await runToolsMenu({ debug: false, io });
    expect(text()).toMatch(/Please type a number from 1 to 6/);
  });
});

describe('paths dragged in from a file manager', () => {
  it('strips the quoting a shell adds', () => {
    expect(stripQuotes("'/Users/me/My Mod'")).toBe('/Users/me/My Mod');
    expect(stripQuotes('"/Users/me/My Mod"')).toBe('/Users/me/My Mod');
    expect(stripQuotes('/Users/me/My\\ Mod')).toBe('/Users/me/My Mod');
  });

  it('leaves an ordinary path alone', () => {
    expect(stripQuotes('/Users/me/mod')).toBe('/Users/me/mod');
  });

  it('does not strip an apostrophe that is part of the name', () => {
    expect(stripQuotes("/Users/me/Krusty's Mod")).toBe("/Users/me/Krusty's Mod");
  });
});

describe('prompt behaviour', () => {
  it('uses the default when the answer is blank', async () => {
    const { io } = scriptedIO(['']);
    expect(await askText(io, { question: 'q', defaultValue: 'fallback' })).toBe('fallback');
  });

  it('re-asks when validation fails', async () => {
    const { io, text } = scriptedIO(['no', 'yes']);
    const answer = await askText(io, {
      question: 'q',
      validate: (value) => (value === 'yes' ? undefined : 'must be yes'),
    });
    expect(answer).toBe('yes');
    expect(text()).toContain('must be yes');
  });

  it('accepts y, n and blank for yes/no', async () => {
    expect(await askYesNo(scriptedIO(['y']).io, { question: 'q', defaultValue: false })).toBe(true);
    expect(await askYesNo(scriptedIO(['n']).io, { question: 'q', defaultValue: true })).toBe(false);
    expect(await askYesNo(scriptedIO(['']).io, { question: 'q', defaultValue: true })).toBe(true);
  });

  it('returns the chosen menu value', async () => {
    const value = await askMenu(scriptedIO(['2']).io, {
      question: 'q',
      choices: [
        { label: 'one', value: 'a' },
        { label: 'two', value: 'b' },
      ],
    });
    expect(value).toBe('b');
  });
});
