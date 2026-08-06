import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadRegistries } from '@sah/registry';
import { checkDefinitions, defaultArtifactPath, generateDefinitions } from '../src/index.js';

/**
 * The check exists to catch four kinds of drift: registry, artifact, upstream
 * pin, and hand-editing. Each gets a test that produces that drift on purpose.
 */

const registries = loadRegistries();
const temporary: string[] = [];

function scratchFile(contents: string): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sah-luadefs-'));
  temporary.push(directory);
  const file = path.join(directory, 'Game.meta.lua');
  fs.writeFileSync(file, contents, 'utf8');
  return file;
}

afterEach(() => {
  while (temporary.length > 0) {
    const directory = temporary.pop();
    if (directory) fs.rmSync(directory, { recursive: true, force: true });
  }
});

const good = generateDefinitions({ registries, toolkitVersion: '0.1.0' });

describe('the committed artifact', () => {
  it('exists and is current', () => {
    const result = checkDefinitions({ registries, toolkitVersion: '0.1.0' });
    expect(result.problems).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.registryCommandCount).toBe(339);
  });

  it('is the file the package ships', () => {
    const artifact = defaultArtifactPath();
    expect(fs.existsSync(artifact)).toBe(true);
    expect(artifact.endsWith(path.join('generated', 'Game.meta.lua'))).toBe(true);
  });
});

describe('drift detection', () => {
  it('fails loudly when the artifact is missing', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sah-luadefs-'));
    temporary.push(directory);
    const result = checkDefinitions({
      registries,
      toolkitVersion: '0.1.0',
      artifactPath: path.join(directory, 'nope.lua'),
    });
    expect(result.ok).toBe(false);
    expect(result.problems.map((p) => p.kind)).toContain('artifact-missing');
  });

  it('detects a command that was deleted by hand', () => {
    const mutilated = good.contents.replace(
      'function Game.SetStageTime(arg1) end',
      '-- removed by hand',
    );
    const result = checkDefinitions({
      registries,
      toolkitVersion: '0.1.0',
      artifactPath: scratchFile(mutilated),
    });
    expect(result.ok).toBe(false);
    const missing = result.problems.filter((p) => p.kind === 'missing-command');
    expect(missing).toHaveLength(1);
    expect(missing[0]?.message).toContain('SetStageTime');
  });

  it('detects an invented command that has no registry record', () => {
    const invented = `${good.contents}\n---Invented.\nfunction Game.SetNightTime(arg1) end\n`;
    const result = checkDefinitions({
      registries,
      toolkitVersion: '0.1.0',
      artifactPath: scratchFile(invented),
    });
    expect(result.ok).toBe(false);
    const problems = result.problems.filter((p) => p.kind === 'invented-command');
    expect(problems).toHaveLength(1);
    expect(problems[0]?.message).toContain('SetNightTime');
  });

  it('detects arity that no longer matches the registry', () => {
    const wrongArity = good.contents.replace(
      'function Game.SetStageTime(arg1) end',
      'function Game.SetStageTime(arg1, arg2) end',
    );
    const result = checkDefinitions({
      registries,
      toolkitVersion: '0.1.0',
      artifactPath: scratchFile(wrongArity),
    });
    expect(result.ok).toBe(false);
    expect(result.problems.some((p) => p.kind === 'arity-mismatch')).toBe(true);
  });

  it('detects an optional marker that misstates the minimum', () => {
    const wrongOptional = good.contents.replace(
      '---@param arg1 any\nfunction Game.SetStageTime(arg1) end',
      '---@param arg1? any\nfunction Game.SetStageTime(arg1) end',
    );
    const result = checkDefinitions({
      registries,
      toolkitVersion: '0.1.0',
      artifactPath: scratchFile(wrongOptional),
    });
    expect(result.ok).toBe(false);
    expect(
      result.problems.some((p) => p.kind === 'arity-mismatch' && p.message.includes('optional')),
    ).toBe(true);
  });

  it('detects scope documentation that was edited away', () => {
    const wrongScope = good.contents.replace(
      '---**Scope:** must appear inside a `Stage` scope.\n---**Arguments:** takes exactly 1 argument.\n---**Provided by:** the base game.\n---\n---Argument names and types are NOT documented upstream, so every parameter is `any`.\n---@param arg1 any\nfunction Game.SetStageTime(arg1) end',
      '---**Scope:** no scope requirement recorded.\n---**Arguments:** takes exactly 1 argument.\n---**Provided by:** the base game.\n---\n---Argument names and types are NOT documented upstream, so every parameter is `any`.\n---@param arg1 any\nfunction Game.SetStageTime(arg1) end',
    );
    expect(wrongScope).not.toBe(good.contents);

    const result = checkDefinitions({
      registries,
      toolkitVersion: '0.1.0',
      artifactPath: scratchFile(wrongScope),
    });
    expect(result.ok).toBe(false);
    expect(result.problems.some((p) => p.kind === 'scope-mismatch')).toBe(true);
  });

  it('detects any byte-level drift from the generator', () => {
    const drifted = good.contents.replace('-- Commands:         339', '-- Commands:         340');
    const result = checkDefinitions({
      registries,
      toolkitVersion: '0.1.0',
      artifactPath: scratchFile(drifted),
    });
    expect(result.ok).toBe(false);
    expect(result.problems.some((p) => p.kind === 'artifact-drift')).toBe(true);
  });

  it('detects a stale upstream pin in the header', () => {
    const staleCommit = good.contents.replace(
      good.upstream.commit,
      '0000000000000000000000000000000000000000',
    );
    const result = checkDefinitions({
      registries,
      toolkitVersion: '0.1.0',
      artifactPath: scratchFile(staleCommit),
    });
    expect(result.ok).toBe(false);
    expect(result.problems.some((p) => p.kind === 'upstream-drift')).toBe(true);
  });

  it('accepts Game.EndIf and Game.Not, which Game.lua defines outside its tables', () => {
    const result = checkDefinitions({
      registries,
      toolkitVersion: '0.1.0',
      artifactPath: scratchFile(good.contents),
    });
    expect(result.problems.filter((p) => p.kind === 'invented-command')).toEqual([]);
    expect(good.contents).toContain('function Game.EndIf() end');
    expect(good.contents).toContain('function Game.Not() end');
  });
});
