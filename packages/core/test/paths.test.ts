import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  escapeLuaString,
  findCaseCollisions,
  inspectGamePath,
  isInside,
  resolveWithin,
  toGamePath,
} from '../src/paths.js';

describe('resolveWithin', () => {
  // Resolved through `path.resolve` so the expectations hold on Windows too,
  // where this becomes something like `D:\campaigns\example`. `resolveWithin`
  // returns a NATIVE absolute path by design — it feeds `fs` calls, not the
  // forward-slashed paths that go inside a mod.
  const root = path.resolve('/campaigns/example');

  it('accepts a plain relative path', () => {
    const result = resolveWithin(root, 'missions/first.yaml');
    expect(result.safe).toBe(true);
    expect(result.resolved).toBe(path.join(root, 'missions', 'first.yaml'));
  });

  it('rejects traversal out of the root', () => {
    for (const candidate of [
      '../secrets.txt',
      'missions/../../secrets.txt',
      'a/b/../../../c',
      '..',
    ]) {
      const result = resolveWithin(root, candidate);
      expect(result.safe, candidate).toBe(false);
    }
  });

  it('rejects absolute paths in both path flavours', () => {
    for (const candidate of ['/etc/passwd', 'C:\\Windows\\System32', '\\\\server\\share']) {
      expect(resolveWithin(root, candidate).safe, candidate).toBe(false);
    }
  });

  it('rejects null bytes and empty paths', () => {
    expect(resolveWithin(root, '').safe).toBe(false);
    expect(resolveWithin(root, 'a\u0000b').safe).toBe(false);
  });

  it('rejects a path that resolves to the root itself', () => {
    expect(resolveWithin(root, '.').safe).toBe(false);
  });
});

describe('isInside', () => {
  it('recognises containment and rejects siblings', () => {
    expect(isInside('/a/b', '/a/b/c')).toBe(true);
    expect(isInside('/a/b', '/a/b')).toBe(true);
    expect(isInside('/a/b', '/a/bc')).toBe(false);
    expect(isInside('/a/b', '/a')).toBe(false);
  });
});

describe('inspectGamePath', () => {
  it('accepts a normal game path in either slash flavour', () => {
    expect(inspectGamePath('scripts\\missions\\level01\\m0i.mfk')).toEqual([]);
    expect(inspectGamePath('Resources/scripts/missions/level01/m0i.lua')).toEqual([]);
  });

  it('flags characters Windows forbids', () => {
    const issues = inspectGamePath('art/we:ird.p3d');
    expect(issues.map((i) => i.kind)).toContain('forbidden-character');
  });

  it('flags reserved Windows device names', () => {
    const issues = inspectGamePath('scripts/CON.mfk');
    expect(issues.map((i) => i.kind)).toContain('reserved-name');
  });

  it('flags trailing spaces and dots that Windows silently strips', () => {
    expect(inspectGamePath('art/folder /file.p3d').map((i) => i.kind)).toContain(
      'trailing-space-or-dot',
    );
    expect(inspectGamePath('art/folder./file.p3d').map((i) => i.kind)).toContain(
      'trailing-space-or-dot',
    );
  });

  it('flags traversal and absolute paths', () => {
    expect(inspectGamePath('../escape.p3d').map((i) => i.kind)).toContain('traversal');
    expect(inspectGamePath('/absolute.p3d').map((i) => i.kind)).toContain('absolute');
  });
});

describe('escapeLuaString', () => {
  it('doubles backslashes, as Game.lua requires', () => {
    // This is the single easiest thing to get wrong when hand-writing scripts.
    expect(escapeLuaString('art\\missions\\level01\\m0.p3d')).toBe(
      'art\\\\missions\\\\level01\\\\m0.p3d',
    );
  });

  it('escapes quotes and newlines', () => {
    expect(escapeLuaString('say "hi"')).toBe('say \\"hi\\"');
    expect(escapeLuaString('a\nb')).toBe('a\\nb');
  });
});

describe('toGamePath', () => {
  it('converts author-friendly slashes to the backslashed game form', () => {
    expect(toGamePath('scripts/missions/level01')).toBe('scripts\\missions\\level01');
  });
});

describe('findCaseCollisions', () => {
  it('detects paths differing only by case', () => {
    const collisions = findCaseCollisions(['Meta.ini', 'meta.ini', 'CustomFiles.ini']);
    expect(collisions).toHaveLength(1);
    expect(collisions[0]?.members).toEqual(['Meta.ini', 'meta.ini']);
  });

  it('returns nothing when all paths are distinct', () => {
    expect(findCaseCollisions(['a.ini', 'b.ini'])).toEqual([]);
  });
});
