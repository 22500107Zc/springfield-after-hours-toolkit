import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXIT_CODES } from '@sah/core';
import { runCli } from '../src/program.js';

/**
 * `sah pocket` end to end, through the real command tree.
 *
 * Exit codes are the contract these tests exist to protect:
 *
 * - 0  ran, nothing to report
 * - 1  ran, found something (collisions, conflicts, differences)
 * - 2  could not run (missing path, outside the project, unconfirmed delete)
 *
 * Everything runs against throwaway fixture directories. No game, no Mod
 * Launcher, no network.
 */

const temporary: string[] = [];
let stdout: string[];
let stderr: string[];

beforeEach(() => {
  stdout = [];
  stderr = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
    stdout.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
    stderr.push(String(chunk));
    return true;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(() => {
  while (temporary.length > 0) {
    const directory = temporary.pop();
    if (directory) fs.rmSync(directory, { recursive: true, force: true });
  }
});

const output = (): string => stdout.join('');
const errors = (): string => stderr.join('');

function fixture(files: Record<string, string>): string {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sah-pocket-cli-')));
  temporary.push(root);
  for (const [relative, contents] of Object.entries(files)) {
    const absolute = path.join(root, ...relative.split('/'));
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, contents);
  }
  return root;
}

function json<T>(): T {
  return JSON.parse(output()) as T;
}

describe('sah pocket --help', () => {
  it('lists all six tools', async () => {
    const code = await runCli(['pocket', '--help']);
    expect(code).toBe(EXIT_CODES.OK);
    for (const name of ['case-check', 'clean-export', 'conflicts', 'manifest', 'diff', 'path']) {
      expect(output(), name).toContain(name);
    }
  });
});

describe('sah pocket case-check', () => {
  it('exits 0 on a clean folder', async () => {
    const root = fixture({ 'resources/a.lua': 'x', 'notes.txt': 'nothing to see' });
    expect(await runCli(['pocket', 'case-check', root])).toBe(EXIT_CODES.OK);
    expect(output()).toContain('No case problems found');
  });

  it('exits 1 and names the file, line and correction', async () => {
    const root = fixture({
      'resources/scripts/a.lua': 'x',
      'CustomFiles.ini': '[PathHandlers]\nk=Resources/Scripts/A.lua\n',
    });

    expect(await runCli(['pocket', 'case-check', root])).toBe(EXIT_CODES.VALIDATION_FAILED);
    expect(output()).toContain('CustomFiles.ini:2:');
    expect(output()).toContain('resources/scripts/a.lua');
  });

  it('emits machine-readable JSON', async () => {
    const root = fixture({
      'resources/a.lua': 'x',
      'x.ini': 'k=Resources/A.lua\n',
    });
    await runCli(['pocket', 'case-check', root, '--json']);

    const parsed = json<{ ok: boolean; references: Array<{ actual: string; line: number }> }>();
    expect(parsed.ok).toBe(false);
    expect(parsed.references[0]?.actual).toBe('resources/a.lua');
    expect(parsed.references[0]?.line).toBe(1);
  });

  it('can skip reading text files entirely', async () => {
    const root = fixture({
      'resources/a.lua': 'x',
      'x.ini': 'k=Resources/A.lua\n',
    });
    expect(await runCli(['pocket', 'case-check', root, '--no-references'])).toBe(EXIT_CODES.OK);
  });

  it('exits 2 with a readable message when the folder does not exist', async () => {
    const code = await runCli(['pocket', 'case-check', path.join(os.tmpdir(), 'sah-nope-98765')]);
    expect(code).toBe(EXIT_CODES.USAGE);
    expect(errors()).toMatch(/Nothing exists at that path/i);
  });
});

describe('sah pocket clean-export', () => {
  const dirty = (): string =>
    fixture({
      'Meta.ini': '[Miscellaneous]\nTitle=T\n',
      'a.lua': 'source',
      '.DS_Store': 'junk',
      '__MACOSX/x': 'junk',
      '.gitignore': 'build/',
    });

  it('previews without a destination and changes nothing', async () => {
    const root = dirty();
    const code = await runCli(['pocket', 'clean-export', root]);

    expect(code).toBe(EXIT_CODES.VALIDATION_FAILED);
    expect(output()).toContain('.DS_Store');
    expect(fs.existsSync(path.join(root, '.DS_Store'))).toBe(true);
  });

  it('writes a clean copy and leaves the original alone', async () => {
    const root = dirty();
    const destination = path.join(fixture({}), 'export');

    expect(await runCli(['pocket', 'clean-export', root, destination])).toBe(EXIT_CODES.OK);
    expect(fs.existsSync(path.join(destination, 'a.lua'))).toBe(true);
    expect(fs.existsSync(path.join(destination, '.gitignore'))).toBe(true);
    expect(fs.existsSync(path.join(destination, '.DS_Store'))).toBe(false);
    expect(fs.existsSync(path.join(destination, '__MACOSX'))).toBe(false);

    expect(fs.existsSync(path.join(root, '.DS_Store'))).toBe(true);
    expect(output()).toContain('The original folder was not modified');
  });

  it('refuses in-place deletion without --yes, and deletes nothing', async () => {
    const root = dirty();
    const code = await runCli(['pocket', 'clean-export', root, '--in-place']);

    expect(code).toBe(EXIT_CODES.USAGE);
    expect(errors()).toMatch(/without confirmation/i);
    expect(fs.existsSync(path.join(root, '.DS_Store'))).toBe(true);
  });

  it('deletes in place with --in-place --yes', async () => {
    const root = dirty();
    expect(await runCli(['pocket', 'clean-export', root, '--in-place', '--yes'])).toBe(
      EXIT_CODES.OK,
    );

    expect(fs.existsSync(path.join(root, '.DS_Store'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'a.lua'))).toBe(true);
    expect(fs.existsSync(path.join(root, '.gitignore'))).toBe(true);
  });

  it('exits 2 rather than clobbering a non-empty destination', async () => {
    const root = dirty();
    const destination = fixture({ 'existing.txt': 'keep me' });

    expect(await runCli(['pocket', 'clean-export', root, destination])).toBe(EXIT_CODES.USAGE);
    expect(fs.readFileSync(path.join(destination, 'existing.txt'), 'utf8')).toBe('keep me');
  });
});

describe('sah pocket conflicts', () => {
  it('exits 0 when two mods do not overlap', async () => {
    const a = fixture({ 'Meta.ini': '[Miscellaneous]\nTitle=A\n', 'a.lua': '1' });
    const b = fixture({ 'Meta.ini': '[Miscellaneous]\nTitle=B\n', 'b.lua': '2' });

    expect(await runCli(['pocket', 'conflicts', a, b])).toBe(EXIT_CODES.OK);
    expect(output()).toContain('No potential file conflicts found');
  });

  it('exits 1 and calls them potential conflicts', async () => {
    const a = fixture({ 'Meta.ini': '[Miscellaneous]\nTitle=A\n', 'shared.lua': '1' });
    const b = fixture({ 'Meta.ini': '[Miscellaneous]\nTitle=B\n', 'shared.lua': '2' });

    expect(await runCli(['pocket', 'conflicts', a, b])).toBe(EXIT_CODES.VALIDATION_FAILED);
    expect(output()).toContain('Potential file conflicts');
    expect(output()).toMatch(/not proven|potential conflicts, not proven/i);
  });

  it('emits JSON with hashes', async () => {
    const a = fixture({ 'Meta.ini': '[Miscellaneous]\nTitle=A\n', 'shared.lua': '1' });
    const b = fixture({ 'Meta.ini': '[Miscellaneous]\nTitle=B\n', 'shared.lua': '2' });
    await runCli(['pocket', 'conflicts', a, b, '--json']);

    const parsed = json<{
      potentialConflicts: Array<{ participants: Array<{ sha256: string }> }>;
    }>();
    expect(parsed.potentialConflicts[0]?.participants[0]?.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('exits 2 when given only one folder', async () => {
    const a = fixture({ 'a.lua': '1' });
    expect(await runCli(['pocket', 'conflicts', a])).toBe(EXIT_CODES.USAGE);
  });
});

describe('sah pocket manifest', () => {
  it('prints deterministic JSON to standard output', async () => {
    const root = fixture({ 'a.txt': 'a', 'b/c.txt': 'c' });

    expect(await runCli(['pocket', 'manifest', root])).toBe(EXIT_CODES.OK);
    const first = output();

    stdout = [];
    await runCli(['pocket', 'manifest', root]);
    expect(output()).toBe(first);
  });

  it('writes to a file and excludes that file from itself', async () => {
    const root = fixture({ 'a.txt': 'a' });
    const target = path.join(root, 'manifest.json');

    expect(await runCli(['pocket', 'manifest', root, '--output', target])).toBe(EXIT_CODES.OK);
    const first = fs.readFileSync(target, 'utf8');

    // Second run sees the manifest on disk; it must still not describe itself.
    await runCli(['pocket', 'manifest', root, '--output', target]);
    expect(fs.readFileSync(target, 'utf8')).toBe(first);

    const parsed = JSON.parse(first) as { files: Array<{ path: string }> };
    expect(parsed.files.map((file) => file.path)).toEqual(['a.txt']);
  });

  it('supports readable text output', async () => {
    const root = fixture({ 'a.txt': 'a' });
    await runCli(['pocket', 'manifest', root, '--format', 'text']);
    expect(output()).toContain('a.txt');
    expect(output()).toContain('content id');
  });

  it('rejects an unknown format', async () => {
    const root = fixture({ 'a.txt': 'a' });
    expect(await runCli(['pocket', 'manifest', root, '--format', 'xml'])).toBe(EXIT_CODES.USAGE);
  });
});

describe('sah pocket diff', () => {
  it('exits 0 when there are no differences', async () => {
    const before = fixture({ 'a.txt': 'same' });
    const after = fixture({ 'a.txt': 'same' });

    expect(await runCli(['pocket', 'diff', before, after])).toBe(EXIT_CODES.OK);
    expect(output()).toContain('No differences');
  });

  it('exits 1 when releases differ', async () => {
    const before = fixture({ 'a.txt': 'old', 'gone.txt': 'x' });
    const after = fixture({ 'a.txt': 'new', 'added.txt': 'y' });

    expect(await runCli(['pocket', 'diff', before, after])).toBe(EXIT_CODES.VALIDATION_FAILED);
    expect(output()).toContain('+ added.txt');
    expect(output()).toContain('- gone.txt');
    expect(output()).toContain('M a.txt');
  });

  it('exits 2 when an input does not exist', async () => {
    const before = fixture({ 'a.txt': 'x' });
    const code = await runCli(['pocket', 'diff', before, path.join(os.tmpdir(), 'sah-nope-12345')]);

    expect(code).toBe(EXIT_CODES.USAGE);
    expect(errors()).toMatch(/Nothing exists at that path/i);
  });

  it('emits deterministic JSON', async () => {
    const before = fixture({ 'a.txt': 'old' });
    const after = fixture({ 'a.txt': 'new' });

    await runCli(['pocket', 'diff', before, after, '--json']);
    const first = output();

    stdout = [];
    await runCli(['pocket', 'diff', before, after, '--json']);
    expect(output()).toBe(first);
  });

  it('compares a saved manifest against a folder', async () => {
    const root = fixture({ 'a.txt': 'x' });
    const manifestFile = path.join(fixture({}), 'v1.json');
    await runCli(['pocket', 'manifest', root, '--output', manifestFile]);

    stdout = [];
    fs.writeFileSync(path.join(root, 'b.txt'), 'new');
    expect(await runCli(['pocket', 'diff', manifestFile, root])).toBe(EXIT_CODES.VALIDATION_FAILED);
    expect(output()).toContain('+ b.txt');
  });
});

describe('sah pocket path', () => {
  it('prints every form for a file inside the project', async () => {
    const root = fixture({ 'Resources/scripts/m0i.lua': 'x' });

    expect(await runCli(['pocket', 'path', root, 'Resources/scripts/m0i.lua'])).toBe(EXIT_CODES.OK);
    expect(output()).toContain('Resources\\scripts\\m0i.lua');
    expect(output()).toContain('Resources/scripts/m0i.lua');
    expect(output()).toContain('Resources\\\\scripts\\\\m0i.lua');
  });

  it('prints one form alone when asked, for pasting', async () => {
    const root = fixture({ 'a/b.lua': 'x' });
    await runCli(['pocket', 'path', root, 'a/b.lua', '--form', 'windows']);
    expect(output()).toBe('a\\b.lua\n');
  });

  it('never prints an absolute path', async () => {
    const root = fixture({ 'a/b.lua': 'x' });
    await runCli(['pocket', 'path', root, 'a/b.lua', '--json']);
    expect(output()).not.toContain(root);
  });

  it('exits 2 for a file outside the project', async () => {
    const root = fixture({ 'a.lua': 'x' });
    const outside = fixture({ 'secret.txt': 'not yours' });

    const code = await runCli(['pocket', 'path', root, path.join(outside, 'secret.txt')]);
    expect(code).toBe(EXIT_CODES.USAGE);
    expect(errors()).toMatch(/outside the project/i);
  });

  it('exits 2 for a traversal attempt', async () => {
    const root = fixture({ 'a.lua': 'x' });
    expect(await runCli(['pocket', 'path', root, '../../etc/passwd'])).toBe(EXIT_CODES.USAGE);
  });

  it('rejects an unknown form', async () => {
    const root = fixture({ 'a.lua': 'x' });
    expect(await runCli(['pocket', 'path', root, 'a.lua', '--form', 'bash'])).toBe(
      EXIT_CODES.USAGE,
    );
  });

  it('handles spaces and Unicode', async () => {
    const root = fixture({ 'my art/ünïcode file.p3d': 'x' });
    await runCli(['pocket', 'path', root, 'my art/ünïcode file.p3d', '--form', 'windows']);

    // Exactly the path on stdout and nothing else, so it can be piped.
    expect(output()).toBe('my art\\ünïcode file.p3d\n');
    // The advisory notes are still emitted — on stderr, where they belong.
    expect(errors()).toMatch(/spaces/);
    expect(errors()).toMatch(/non-ASCII/);
  });
});
