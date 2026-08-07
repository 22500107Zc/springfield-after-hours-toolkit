import fs from 'node:fs';
import { parse as parseLua } from 'luaparse';
import { describe, expect, it } from 'vitest';
import { listRecords, loadRegistries } from '@sah/registry';
import {
  collectDefinitions,
  generateDefinitions,
  isPlainLuaIdentifier,
  parseGeneratedFunctions,
} from '../src/index.js';

/**
 * The real version, read from the workspace root rather than hard-coded.
 *
 * The generated file records which generator produced it, so its bytes change
 * with every version bump. A literal here would turn each release into a
 * mysterious test failure, which is exactly what happened at 0.1.1.
 */
const TOOLKIT_VERSION = JSON.parse(
  fs.readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'),
).version as string;

const registries = loadRegistries();
const commandRecords = listRecords(registries, 'commands');
const generated = generateDefinitions({ registries, toolkitVersion: TOOLKIT_VERSION });

describe('coverage of the command registry', () => {
  it('generates a definition for every verified command', () => {
    const emitted = new Set(parseGeneratedFunctions(generated.contents).keys());
    const missing = commandRecords
      .map((record) => record.gameCode ?? record.displayName)
      .filter((name) => !emitted.has(name));
    expect(missing).toEqual([]);
  });

  it('covers all 339 commands currently in the registry', () => {
    // A hard number, so that a registry change is a deliberate decision rather
    // than something that silently slips through.
    expect(commandRecords).toHaveLength(339);
    expect(generated.commandNames).toHaveLength(339);
  });

  it('invents nothing that is not in the registry', () => {
    const known = new Set(commandRecords.map((r) => r.gameCode ?? r.displayName));
    // Game.lua defines these two outside its command tables.
    const allowedExtras = new Set(['EndIf', 'Not']);

    for (const name of parseGeneratedFunctions(generated.contents).keys()) {
      if (allowedExtras.has(name)) continue;
      const base = name.startsWith('Not_') ? name.slice('Not_'.length) : name;
      expect(known.has(base), `"${name}" is not backed by a registry record`).toBe(true);
    }
  });

  it('emits a Not_ inverse for exactly the conditional commands', () => {
    const conditionals = commandRecords
      .filter((record) => record['conditional'] === true)
      .map((record) => record.gameCode ?? record.displayName);
    const inverses = generated.definitions
      .filter((definition) => definition.inverseOf !== undefined)
      .map((definition) => definition.inverseOf);

    expect(inverses.sort()).toEqual([...conditionals].sort());
    expect(conditionals.length).toBeGreaterThan(0);
  });
});

describe('arity annotations', () => {
  const emitted = parseGeneratedFunctions(generated.contents);

  it('gives exact-arity commands exactly that many required parameters', () => {
    // SetStageTime takes exactly 1 argument per Game.lua's own table.
    const setStageTime = emitted.get('SetStageTime');
    expect(setStageTime?.params).toEqual(['arg1']);
    expect(setStageTime?.optional).toBe(0);
    expect(generated.contents).toContain('function Game.SetStageTime(arg1) end');
  });

  it('gives zero-arity commands no parameters', () => {
    expect(emitted.get('CloseObjective')?.params).toEqual([]);
    expect(generated.contents).toContain('function Game.CloseObjective() end');
  });

  it('marks the optional range on ranged-arity commands', () => {
    // AddStage accepts 0-7, so all seven parameters are optional.
    const addStage = emitted.get('AddStage');
    expect(addStage?.params).toHaveLength(7);
    expect(addStage?.optional).toBe(7);
    expect(generated.contents).toContain('---@param arg1? any');
  });

  it('marks only the arguments beyond the minimum as optional', () => {
    for (const definition of generated.definitions) {
      const entry = emitted.get(definition.name);
      expect(entry, definition.name).toBeDefined();
      expect(entry?.params.length, `${definition.name} parameter count`).toBe(definition.maxArgs);
      expect(entry?.optional, `${definition.name} optional count`).toBe(
        definition.maxArgs - definition.minArgs,
      );
    }
  });

  it('states the arity in prose as well as annotations', () => {
    expect(generated.contents).toContain('**Arguments:** takes exactly 1 argument.');
    expect(generated.contents).toContain('**Arguments:** takes 0–7 arguments.');
    expect(generated.contents).toContain('**Arguments:** takes no arguments.');
  });
});

describe('scope documentation', () => {
  it('documents the required scope for every command that has one', () => {
    for (const definition of generated.definitions) {
      if (!definition.requiresScope) continue;
      expect(
        generated.contents,
        `${definition.name} should document scope ${definition.requiresScope}`,
      ).toContain(`must appear inside a \`${definition.requiresScope}\` scope.`);
    }
  });

  it('documents opened and closed scopes', () => {
    expect(generated.contents).toContain('**Opens scope:** `Stage`.');
    expect(generated.contents).toContain('**Closes scope:** `Mission`.');
  });

  it('says plainly when no scope requirement is recorded', () => {
    expect(generated.contents).toContain('**Scope:** no scope requirement recorded.');
  });

  it('warns about commands upstream marks unused or commented', () => {
    expect(generated.contents).toMatch(/marks this command "unused"/);
  });
});

describe('honesty of the generated file', () => {
  it('never invents an argument name or type', () => {
    // Every parameter must be argN: any. Anything else would be a guess.
    const params = generated.contents.match(/^---@param \S+ .+$/gm) ?? [];
    expect(params.length).toBeGreaterThan(0);
    for (const line of params) {
      expect(line).toMatch(/^---@param arg\d+\??\s+any$/);
    }
  });

  it('records the pinned upstream commit and source hash', () => {
    expect(generated.contents).toContain(generated.upstream.commit);
    expect(generated.upstream.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(generated.contents).toContain(
      'a382b01ef5e1d8a2c9ed0ff0fab10156f33b083d232eb9d392977cfb8181a128',
    );
  });

  it('attributes Game.lua to Donut Team under MIT', () => {
    expect(generated.contents).toContain('Donut Team');
    expect(generated.contents).toContain('MIT');
  });

  it('states that editor checking does not prove the script works', () => {
    expect(generated.contents).toMatch(/do NOT prove a script works in the game/i);
    expect(generated.contents).toMatch(/scope rules below are documentation\s*\n?--\s*only/i);
  });

  it('marks itself as a meta file that must not be executed', () => {
    expect(generated.contents.startsWith('---@meta\n')).toBe(true);
    expect(generated.contents).toContain('error("Meta files should not be executed.")');
  });
});

describe('determinism', () => {
  it('produces byte-identical output across repeated runs', () => {
    const again = generateDefinitions({ registries, toolkitVersion: TOOLKIT_VERSION });
    expect(again.contents).toBe(generated.contents);
    expect(again.sha256).toBe(generated.sha256);
  });

  it('produces identical output from a freshly loaded registry', () => {
    const fresh = generateDefinitions({
      registries: loadRegistries(),
      toolkitVersion: TOOLKIT_VERSION,
    });
    expect(fresh.sha256).toBe(generated.sha256);
  });

  it('sorts definitions deterministically by name', () => {
    const names = generated.definitions.map((definition) => definition.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
  });

  it('uses LF line endings and no carriage returns on every platform', () => {
    expect(generated.contents).not.toContain('\r');
    expect(generated.contents.endsWith('\n')).toBe(true);
    expect(generated.contents.endsWith('\n\n')).toBe(false);
  });

  it('contains no timestamp that would vary between runs', () => {
    expect(generated.contents).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
  });
});

describe('the generated file is valid Lua', () => {
  it('parses as Lua 5.3 source', () => {
    // A real parser, not a regex: if this file cannot be parsed, the language
    // server cannot read it either.
    expect(() => parseLua(generated.contents, { luaVersion: '5.3' })).not.toThrow();
  });

  it('declares every command as a function statement on the Game table', () => {
    const ast = parseLua(generated.contents, { luaVersion: '5.3' }) as {
      body: Array<Record<string, unknown>>;
    };
    const functionStatements = ast.body.filter((node) => node['type'] === 'FunctionDeclaration');
    // 339 commands + 10 inverses + EndIf + Not
    expect(functionStatements).toHaveLength(339 + 10 + 2);
  });
});

describe('identifier safety', () => {
  it('accepts ordinary command names', () => {
    expect(isPlainLuaIdentifier('AddStage')).toBe(true);
    expect(isPlainLuaIdentifier('RESET_TO_HERE')).toBe(true);
    expect(isPlainLuaIdentifier('msPlacePlayerCarAtLocatorName')).toBe(true);
  });

  it('rejects names that could not be written as Game.<name>', () => {
    expect(isPlainLuaIdentifier('end')).toBe(false);
    expect(isPlainLuaIdentifier('has-dash')).toBe(false);
    expect(isPlainLuaIdentifier('2Start')).toBe(false);
    expect(isPlainLuaIdentifier('')).toBe(false);
  });

  it('every registry command name is emittable', () => {
    for (const definition of collectDefinitions(registries)) {
      expect(isPlainLuaIdentifier(definition.name), definition.name).toBe(true);
    }
  });
});
