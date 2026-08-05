import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXIT_CODES } from '@sah/core';
import { runCli } from '../src/program.js';

/**
 * CLI exit codes are part of the public contract, so they are asserted here
 * rather than assumed. Output is captured so the tests stay quiet.
 */

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
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

const output = (): string => stdout.join('');

describe('sah --help', () => {
  it('exits zero and names the toolkit', async () => {
    const code = await runCli(['--help']);
    expect(code).toBe(EXIT_CODES.OK);
    expect(output()).toContain('Springfield After Hours Toolkit');
  });

  it('states that this is unofficial and unaffiliated', async () => {
    await runCli(['--help']);
    expect(output()).toMatch(/not affiliated/i);
  });
});

describe('sah doctor', () => {
  it('emits JSON without leaking an API key', async () => {
    await runCli(['doctor', '--json']);
    const parsed = JSON.parse(output()) as { checks: Array<{ name: string; detail: string }> };
    const keyCheck = parsed.checks.find((c) => c.name === 'ANTHROPIC_API_KEY');
    expect(keyCheck).toBeDefined();
    expect(output()).not.toMatch(/sk-ant-/);
  });

  it('reports the platform launch limitation honestly', async () => {
    await runCli(['doctor', '--json']);
    const parsed = JSON.parse(output()) as {
      platform: { canLaunchGameNatively: boolean; launchNotes: string[] };
    };
    if (process.platform !== 'win32') {
      expect(parsed.platform.canLaunchGameNatively).toBe(false);
      expect(parsed.platform.launchNotes.join(' ')).toMatch(/Windows/);
    }
  });
});

describe('sah validate', () => {
  it('exits 0 for a valid campaign', async () => {
    const code = await runCli(['validate', path.join(repoRoot, 'examples/minimal-campaign')]);
    expect(code).toBe(EXIT_CODES.OK);
  });

  it('exits 1 for a campaign with validation errors', async () => {
    const code = await runCli([
      'validate',
      path.join(repoRoot, 'fixtures/invalid/unresolved-references'),
    ]);
    expect(code).toBe(EXIT_CODES.VALIDATION_FAILED);
  });

  it('exits 1 for the Springfield After Hours example, which is expected to fail', async () => {
    const code = await runCli([
      'validate',
      path.join(repoRoot, 'examples/springfield-after-hours'),
    ]);
    expect(code).toBe(EXIT_CODES.VALIDATION_FAILED);
  });

  it('exits 3 when there is no campaign at the path', async () => {
    const code = await runCli(['validate', path.join(os.tmpdir(), 'sah-nothing-here-98765')]);
    expect(code).toBe(EXIT_CODES.NOT_FOUND);
  });

  it('emits machine-readable JSON with --json', async () => {
    await runCli(['validate', path.join(repoRoot, 'examples/springfield-after-hours'), '--json']);
    const parsed = JSON.parse(output()) as { ok: boolean; diagnostics: Array<{ code: string }> };
    expect(parsed.ok).toBe(false);
    expect(parsed.diagnostics.some((d) => d.code === 'SAH2001')).toBe(true);
  });
});

describe('sah build', () => {
  let directory: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sah-cli-build-'));
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('builds a valid campaign and exits 0', async () => {
    const code = await runCli([
      'build',
      path.join(repoRoot, 'examples/minimal-campaign'),
      '--output',
      directory,
    ]);
    expect(code).toBe(EXIT_CODES.OK);
    expect(fs.existsSync(path.join(directory, 'Meta.ini'))).toBe(true);
  });

  it('refuses to build a campaign with errors and exits 1', async () => {
    const code = await runCli([
      'build',
      path.join(repoRoot, 'examples/springfield-after-hours'),
      '--output',
      directory,
    ]);
    expect(code).toBe(EXIT_CODES.VALIDATION_FAILED);
    expect(fs.existsSync(path.join(directory, 'Meta.ini'))).toBe(false);
  });

  it('writes nothing during a dry run', async () => {
    const code = await runCli([
      'build',
      path.join(repoRoot, 'examples/minimal-campaign'),
      '--output',
      path.join(directory, 'nested'),
      '--dry-run',
    ]);
    expect(code).toBe(EXIT_CODES.OK);
    expect(fs.existsSync(path.join(directory, 'nested'))).toBe(false);
  });
});

describe('sah init', () => {
  let directory: string;

  beforeEach(() => {
    directory = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sah-cli-init-')), 'workspace');
  });

  afterEach(() => {
    fs.rmSync(path.dirname(directory), { recursive: true, force: true });
  });

  it('creates a workspace that validates cleanly', async () => {
    expect(await runCli(['init', directory, '--id', 'test-campaign'])).toBe(EXIT_CODES.OK);
    expect(await runCli(['validate', directory])).toBe(EXIT_CODES.OK);
  });

  it('refuses to overwrite without --force', async () => {
    await runCli(['init', directory, '--id', 'test-campaign']);
    const code = await runCli(['init', directory, '--id', 'test-campaign']);
    expect(code).toBe(EXIT_CODES.REFUSED_OVERWRITE);
  });

  it('overwrites when --force is given', async () => {
    await runCli(['init', directory, '--id', 'test-campaign']);
    const code = await runCli(['init', directory, '--id', 'test-campaign', '--force']);
    expect(code).toBe(EXIT_CODES.OK);
  });
});

describe('sah registry', () => {
  it('validates all registries', async () => {
    expect(await runCli(['registry', 'validate'])).toBe(EXIT_CODES.OK);
  });

  it('finds a verified character', async () => {
    await runCli(['registry', 'search', 'character', 'Comic Book Guy', '--json']);
    const parsed = JSON.parse(output()) as { count: number; results: Array<{ id: string }> };
    expect(parsed.results[0]?.id).toBe('cbg');
  });

  it('returns no results for unverified content, and still exits 0', async () => {
    const code = await runCli(['registry', 'search', 'location', 'Java Server', '--json']);
    expect(code).toBe(EXIT_CODES.OK);
    const parsed = JSON.parse(output()) as { count: number };
    expect(parsed.count).toBe(0);
  });

  it('rejects an unknown registry kind with a usage error', async () => {
    const code = await runCli(['registry', 'list', 'not-a-registry']);
    expect(code).toBe(EXIT_CODES.USAGE);
  });
});

describe('sah explain', () => {
  it('explains a known diagnostic code', async () => {
    const code = await runCli(['explain', 'SAH2001', '--json']);
    expect(code).toBe(EXIT_CODES.OK);
    const parsed = JSON.parse(output()) as { title: string; fixes: string[] };
    expect(parsed.fixes.length).toBeGreaterThan(0);
  });

  it('exits 2 for an unknown code', async () => {
    expect(await runCli(['explain', 'SAH9999'])).toBe(EXIT_CODES.USAGE);
  });
});

describe('sah ai', () => {
  it('reports unavailable without an API key rather than failing obscurely', async () => {
    const original = process.env['ANTHROPIC_API_KEY'];
    delete process.env['ANTHROPIC_API_KEY'];
    try {
      const code = await runCli(['ai', 'doctor', '--json']);
      expect(code).toBe(EXIT_CODES.UNSUPPORTED);
      const parsed = JSON.parse(output()) as { apiKeyPresent: boolean };
      expect(parsed.apiKeyPresent).toBe(false);
    } finally {
      if (original !== undefined) process.env['ANTHROPIC_API_KEY'] = original;
    }
  });
});

describe('sah config', () => {
  it('never prints anything resembling an API key', async () => {
    const original = process.env['ANTHROPIC_API_KEY'];
    const canary = `sk-ant-${'should'}-never-appear`;
    process.env['ANTHROPIC_API_KEY'] = canary;
    try {
      await runCli(['config', '--json']);
      expect(output()).not.toContain(canary);
    } finally {
      if (original === undefined) delete process.env['ANTHROPIC_API_KEY'];
      else process.env['ANTHROPIC_API_KEY'] = original;
    }
  });
});
