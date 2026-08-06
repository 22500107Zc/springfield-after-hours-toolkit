import fs from 'node:fs';
import path from 'node:path';
import { findUpwards, moduleDirectory, sha256 } from '@sah/core';
import type { RegistrySet } from '@sah/registry';
import { generateDefinitions, type CommandDefinition } from './generate.js';

/**
 * Verifies a generated definitions file against the registry.
 *
 * The point is not "does the file parse" — it is "does this file still tell the
 * truth". Four things can drift apart: the registry, the generated artifact,
 * upstream Game.lua, and the pin recorded in the lockfile. This checks all of
 * them and reports each mismatch separately, because the fix differs.
 */

export type CheckSeverity = 'error' | 'warning';

export interface CheckProblem {
  severity: CheckSeverity;
  kind:
    | 'missing-command'
    | 'invented-command'
    | 'arity-mismatch'
    | 'scope-mismatch'
    | 'artifact-drift'
    | 'artifact-missing'
    | 'upstream-drift';
  message: string;
  hint?: string;
}

export interface CheckResult {
  ok: boolean;
  /** Absolute path of the artifact that was checked. */
  artifactPath: string;
  /** Commands in the registry. */
  registryCommandCount: number;
  /** Function definitions the generator would emit, including Not_ inverses. */
  definitionCount: number;
  problems: CheckProblem[];
  expectedSha256: string;
  actualSha256: string | undefined;
}

/** Locates the committed artifact inside this repository. */
export function defaultArtifactPath(): string {
  const marker = path.join('packages', 'game-lua-definitions', 'package.json');
  const root = findUpwards(moduleDirectory(import.meta.url), marker);
  if (!root) {
    throw new Error('Could not locate packages/game-lua-definitions.');
  }
  return path.join(root, 'packages', 'game-lua-definitions', 'generated', 'Game.meta.lua');
}

/**
 * Parses the function names and their parameter lists back out of a generated
 * file, so the check reads the artifact rather than trusting the generator.
 */
export function parseGeneratedFunctions(
  contents: string,
): Map<string, { params: string[]; optional: number }> {
  const found = new Map<string, { params: string[]; optional: number }>();

  // Walk line by line, accumulating the run of `---` comment lines that
  // immediately precedes each function. Splitting the file on `---` instead
  // would put every single annotation in its own block, which silently
  // undercounts the optional parameters.
  let docBlock: string[] = [];

  for (const line of contents.split('\n')) {
    if (line.startsWith('---')) {
      docBlock.push(line);
      continue;
    }

    const signature = /^function Game\.([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\) end$/.exec(line);
    if (signature) {
      const name = signature[1] as string;
      const rawParams = (signature[2] as string).trim();
      found.set(name, {
        params: rawParams.length === 0 ? [] : rawParams.split(',').map((p) => p.trim()),
        optional: docBlock.filter((entry) => /^---@param arg\d+\? any$/.test(entry)).length,
      });
    }

    docBlock = [];
  }

  return found;
}

export interface CheckOptions {
  registries: RegistrySet;
  toolkitVersion: string;
  /** Defaults to the committed artifact in this repository. */
  artifactPath?: string;
}

export function checkDefinitions(options: CheckOptions): CheckResult {
  const artifactPath = options.artifactPath ?? defaultArtifactPath();
  const generated = generateDefinitions({
    registries: options.registries,
    toolkitVersion: options.toolkitVersion,
  });

  const problems: CheckProblem[] = [];

  if (!fs.existsSync(artifactPath)) {
    problems.push({
      severity: 'error',
      kind: 'artifact-missing',
      message: `No generated definitions found at ${artifactPath}.`,
      hint: 'Run "sah lua-defs generate".',
    });
    return {
      ok: false,
      artifactPath,
      registryCommandCount: generated.commandNames.length,
      definitionCount: generated.definitions.length,
      problems,
      expectedSha256: generated.sha256,
      actualSha256: undefined,
    };
  }

  const actual = fs.readFileSync(artifactPath, 'utf8');
  const actualSha = sha256(actual);
  const parsed = parseGeneratedFunctions(actual);

  const expectedByName = new Map<string, CommandDefinition>(
    generated.definitions.map((definition) => [definition.name, definition]),
  );

  // 1. Every verified command must have a definition.
  for (const definition of generated.definitions) {
    if (!parsed.has(definition.name)) {
      problems.push({
        severity: 'error',
        kind: 'missing-command',
        message: `Command "${definition.name}" is in the registry but has no definition.`,
        hint: 'Run "sah lua-defs generate".',
      });
    }
  }

  // 2. Nothing may appear that the registry does not know about.
  //    `EndIf` and `Not` are defined by Game.lua outside the command tables.
  const nonRegistryFunctions = new Set(['EndIf', 'Not']);
  for (const name of parsed.keys()) {
    if (expectedByName.has(name) || nonRegistryFunctions.has(name)) continue;
    problems.push({
      severity: 'error',
      kind: 'invented-command',
      message: `Definition file declares "Game.${name}", which is not in the command registry.`,
      hint: 'A command with no registry record has no verified source. Remove it, or add a registry record with provenance.',
    });
  }

  // 3. Arity must match the registry exactly.
  for (const [name, actualEntry] of parsed) {
    const expected = expectedByName.get(name);
    if (!expected) continue;

    if (actualEntry.params.length !== expected.maxArgs) {
      problems.push({
        severity: 'error',
        kind: 'arity-mismatch',
        message: `"Game.${name}" declares ${actualEntry.params.length} parameter(s); the registry records a maximum of ${expected.maxArgs}.`,
      });
    }
    const expectedOptional = expected.maxArgs - expected.minArgs;
    if (actualEntry.optional !== expectedOptional) {
      problems.push({
        severity: 'error',
        kind: 'arity-mismatch',
        message: `"Game.${name}" marks ${actualEntry.optional} parameter(s) optional; the registry implies ${expectedOptional} (min ${expected.minArgs}, max ${expected.maxArgs}).`,
      });
    }
  }

  // 4. Scope documentation must match the registry.
  for (const definition of generated.definitions) {
    if (!definition.requiresScope) continue;
    const needle = `---**Scope:** must appear inside a \`${definition.requiresScope}\` scope.`;
    const block = extractBlock(actual, definition.name);
    if (block !== undefined && !block.includes(needle)) {
      problems.push({
        severity: 'error',
        kind: 'scope-mismatch',
        message: `"Game.${definition.name}" does not document its required scope "${definition.requiresScope}".`,
      });
    }
  }

  // 5. The artifact must match what the generator produces right now.
  if (actualSha !== generated.sha256) {
    problems.push({
      severity: 'error',
      kind: 'artifact-drift',
      message: 'The committed definitions file does not match generator output.',
      hint: 'Run "sah lua-defs generate" and commit the result.',
    });
  }

  // 6. The artifact header must name the currently pinned upstream commit.
  if (!actual.includes(generated.upstream.commit)) {
    problems.push({
      severity: 'error',
      kind: 'upstream-drift',
      message: `The definitions file does not reference the pinned Game.lua commit ${generated.upstream.commit}.`,
      hint: 'The upstream pin changed. Re-derive the command registry, then regenerate the definitions.',
    });
  }

  return {
    ok: !problems.some((problem) => problem.severity === 'error'),
    artifactPath,
    registryCommandCount: generated.commandNames.length,
    definitionCount: generated.definitions.length,
    problems,
    expectedSha256: generated.sha256,
    actualSha256: actualSha,
  };
}

/** Returns the doc-comment block immediately preceding a function definition. */
function extractBlock(contents: string, name: string): string | undefined {
  const index = contents.indexOf(`function Game.${name}(`);
  if (index < 0) return undefined;
  const before = contents.slice(0, index);
  const start = before.lastIndexOf('\n\n');
  return contents.slice(start < 0 ? 0 : start, index);
}
