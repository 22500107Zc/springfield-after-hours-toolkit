import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { PATH_FORMS, isPathFormName, projectPath } from '../src/index.js';
import { at, canSymlink, cleanupTempDirs, makeTree, trySymlink } from './helpers.js';

afterAll(cleanupTempDirs);

describe('path forms', () => {
  it('produces every form for a nested file', () => {
    const root = makeTree({ 'Resources/scripts/m0i.lua': 'x' });
    const result = projectPath({ project: root, target: 'Resources/scripts/m0i.lua' });

    expect(result.posix).toBe('Resources/scripts/m0i.lua');
    expect(result.windows).toBe('Resources\\scripts\\m0i.lua');
    expect(result.ini).toBe('Resources\\\\scripts\\\\m0i.lua');
    expect(result.lua).toBe('"Resources\\\\scripts\\\\m0i.lua"');
  });

  it('handles a file at the project root', () => {
    const root = makeTree({ 'Meta.ini': 'x' });
    const result = projectPath({ project: root, target: 'Meta.ini' });

    expect(result.posix).toBe('Meta.ini');
    expect(result.windows).toBe('Meta.ini');
  });

  it('accepts an absolute path inside the project', () => {
    const root = makeTree({ 'a/b.lua': 'x' });
    expect(projectPath({ project: root, target: at(root, 'a/b.lua') }).posix).toBe('a/b.lua');
  });

  it('works for a folder as well as a file', () => {
    const root = makeTree({ 'Resources/scripts/a.lua': 'x' });
    expect(projectPath({ project: root, target: 'Resources/scripts' }).windows).toBe(
      'Resources\\scripts',
    );
  });

  it('reports the project by name only, never by absolute path', () => {
    const root = makeTree({ 'a.lua': 'x' });
    const result = projectPath({ project: root, target: 'a.lua' });

    expect(result.project).toBe(path.basename(root));
    // The whole point: a copied path must not carry a home directory into a
    // forum post, and must work on someone else's machine.
    expect(JSON.stringify(result)).not.toContain(root);
    expect(result.windows).not.toContain(path.sep === '/' ? '/home' : 'C:');
  });
});

describe('awkward names', () => {
  it('handles spaces', () => {
    const root = makeTree({ 'my art/a file.p3d': 'x' });
    const result = projectPath({ project: root, target: 'my art/a file.p3d' });

    expect(result.windows).toBe('my art\\a file.p3d');
    expect(result.notes.join(' ')).toMatch(/spaces/);
  });

  it('handles apostrophes without mangling them', () => {
    const root = makeTree({ "Krusty's/burger.lua": 'x' });
    const result = projectPath({ project: root, target: "Krusty's/burger.lua" });

    expect(result.windows).toBe("Krusty's\\burger.lua");
    expect(result.notes.join(' ')).toMatch(/apostrophe/);
  });

  it('handles Unicode', () => {
    const root = makeTree({ 'niveau spécial/ünïcode 🍩.lua': 'x' });
    const result = projectPath({ project: root, target: 'niveau spécial/ünïcode 🍩.lua' });

    expect(result.posix).toBe('niveau spécial/ünïcode 🍩.lua');
    expect(result.windows).toBe('niveau spécial\\ünïcode 🍩.lua');
    expect(result.notes.join(' ')).toMatch(/non-ASCII/);
  });

  it('escapes a quote so a Lua literal cannot be broken out of', () => {
    // Not creatable on Windows, but the escaping is what is under test and it
    // is pure string work.
    const result = { lua: `"${'a"b'.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"` };
    expect(result.lua).toBe('"a\\"b"');
  });

  it('doubles backslashes exactly once for the ini form', () => {
    const root = makeTree({ 'a/b/c.lua': 'x' });
    const result = projectPath({ project: root, target: 'a/b/c.lua' });

    expect(result.ini).toBe('a\\\\b\\\\c.lua');
    expect(result.ini).not.toContain('\\\\\\');
  });
});

describe('refusing what is outside the project', () => {
  it('refuses an absolute path outside', () => {
    const outside = makeTree({ 'secret.txt': 'not yours' });
    const root = makeTree({ 'a.lua': 'x' });

    expect(() => projectPath({ project: root, target: at(outside, 'secret.txt') })).toThrow(
      /outside the project/i,
    );
  });

  it('refuses .. traversal', () => {
    const outside = makeTree({ 'secret.txt': 'not yours' });
    const root = makeTree({ 'a.lua': 'x' });
    const traversal = path.relative(root, at(outside, 'secret.txt'));

    expect(() => projectPath({ project: root, target: traversal })).toThrow(/outside the project/i);
  });

  it('refuses traversal even to somewhere that does not exist', () => {
    // Out of scope is out of scope. Answering "no such file" here would both
    // read worse and quietly probe the filesystem around the project.
    const root = makeTree({ 'a.lua': 'x' });
    expect(() => projectPath({ project: root, target: '../../../../etc/passwd' })).toThrow(
      /outside the project/i,
    );
  });

  it('refuses the project folder itself', () => {
    const root = makeTree({ 'a.lua': 'x' });
    expect(() => projectPath({ project: root, target: '.' })).toThrow(/project folder itself/i);
  });

  it('refuses a file that does not exist', () => {
    const root = makeTree({ 'a.lua': 'x' });
    expect(() => projectPath({ project: root, target: 'nope.lua' })).toThrow(/Nothing exists/i);
  });

  it.skipIf(!canSymlink())('refuses a link inside the project that points outside it', () => {
    const outside = makeTree({ 'secret.txt': 'not yours' });
    const root = makeTree({ 'a.lua': 'x' });
    trySymlink(at(outside, 'secret.txt'), at(root, 'escape.lua'));

    expect(() => projectPath({ project: root, target: 'escape.lua' })).toThrow(
      /outside the project/i,
    );
  });
});

describe('form names', () => {
  it('accepts exactly the documented forms', () => {
    expect([...PATH_FORMS]).toEqual(['windows', 'posix', 'ini', 'lua']);
    for (const form of PATH_FORMS) expect(isPathFormName(form)).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isPathFormName('bash')).toBe(false);
    expect(isPathFormName('')).toBe(false);
  });
});
