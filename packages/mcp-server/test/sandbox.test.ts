import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  SandboxViolation,
  createSandbox,
  resolveInSandbox,
  toWorkspaceRelative,
} from '../src/sandbox.js';

/**
 * The caller of an MCP tool is a language model, so path handling gets the same
 * scrutiny as untrusted input from a network client.
 */

let workspace: string;
let forbidden: string;

beforeAll(() => {
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'sah-sandbox-'));
  forbidden = fs.mkdtempSync(path.join(os.tmpdir(), 'sah-game-install-'));
  fs.mkdirSync(path.join(workspace, 'missions'), { recursive: true });
  fs.writeFileSync(path.join(workspace, 'missions', 'a.yaml'), 'version: 1\n');
});

afterAll(() => {
  fs.rmSync(workspace, { recursive: true, force: true });
  fs.rmSync(forbidden, { recursive: true, force: true });
});

describe('createSandbox', () => {
  it('refuses a root that does not exist', () => {
    expect(() => createSandbox(path.join(os.tmpdir(), 'definitely-not-here-12345'))).toThrow(
      SandboxViolation,
    );
  });
});

describe('resolveInSandbox', () => {
  it('resolves an ordinary relative path', () => {
    const sandbox = createSandbox(workspace);
    expect(resolveInSandbox(sandbox, 'missions/a.yaml')).toBe(
      path.join(workspace, 'missions', 'a.yaml'),
    );
  });

  it('rejects traversal attempts', () => {
    const sandbox = createSandbox(workspace);
    for (const candidate of [
      '../outside.yaml',
      '../../etc/passwd',
      'missions/../../escape.yaml',
      'missions/../../../tmp/x',
    ]) {
      expect(() => resolveInSandbox(sandbox, candidate), candidate).toThrow(SandboxViolation);
    }
  });

  it('rejects absolute paths, including Windows-style ones', () => {
    const sandbox = createSandbox(workspace);
    for (const candidate of ['/etc/passwd', 'C:\\Windows\\System32\\config', '\\\\srv\\share']) {
      expect(() => resolveInSandbox(sandbox, candidate), candidate).toThrow(SandboxViolation);
    }
  });

  it('rejects null bytes', () => {
    const sandbox = createSandbox(workspace);
    expect(() => resolveInSandbox(sandbox, 'missions/a\u0000.yaml')).toThrow(SandboxViolation);
  });

  it('refuses paths inside a protected game installation', () => {
    // Even a path that is technically inside the workspace must be refused if
    // it lands in a directory the user configured as their game install.
    const sandbox = createSandbox(workspace, [forbidden]);
    const inside = path.relative(workspace, path.join(forbidden, 'shar.exe'));
    expect(() => resolveInSandbox(sandbox, inside)).toThrow(SandboxViolation);
  });

  it('explains why it refused, rather than failing silently', () => {
    const sandbox = createSandbox(workspace);
    try {
      resolveInSandbox(sandbox, '../escape');
      throw new Error('expected a SandboxViolation');
    } catch (error) {
      expect((error as Error).message).toMatch(/workspace root/i);
    }
  });
});

describe('toWorkspaceRelative', () => {
  it('returns forward-slashed paths regardless of host platform', () => {
    const sandbox = createSandbox(workspace);
    const absolute = path.join(workspace, 'missions', 'a.yaml');
    expect(toWorkspaceRelative(sandbox, absolute)).toBe('missions/a.yaml');
  });
});
