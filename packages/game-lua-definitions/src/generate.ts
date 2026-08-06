import { normaliseText, sha256 } from '@sah/core';
import { gameLuaDependency, type UpstreamDependency } from '@sah/adapter-game-lua';
import { listRecords, type LoadedRecord, type RegistrySet } from '@sah/registry';

/**
 * Generates a Lua Language Server meta file for the `Game.*` mission commands.
 *
 * WHY THIS EXISTS
 * ---------------
 * Donut Team publishes LuaLS definitions for the *Custom Files* Lua API —
 * `Output`, `Redirect`, `GetPath`, the filesystem helpers, mod settings, save
 * data, game-state queries and the Launcher tables. Those cover the functions a
 * mod calls to *handle files*.
 *
 * They do not cover the `Game.*` table, because Game.lua builds it at runtime:
 * `AddCommand` installs a closure per command into a table, so there is no
 * source declaration for an editor to read. The result is that mission scripts —
 * the part a campaign author actually writes — get no completion at all.
 *
 * This generator closes that gap from the command registry, which is itself
 * derived mechanically from Game.lua's own `DefaultCommands`, `ASFCommands` and
 * `DebugTestCommands` tables.
 *
 * WHAT IT WILL NOT DO
 * -------------------
 * Argument *names* and *types* are not published anywhere this project has read.
 * So every parameter is emitted as `argN: any`. That is deliberately unhelpful
 * in the honest direction: the toolkit knows how many arguments a command takes
 * and where it is legal, and it says exactly that and nothing more.
 */

/** How a command's arity is expressed in the generated file. */
export type ArityKind = 'none' | 'exact' | 'ranged';

export interface CommandDefinition {
  /** The name written into the meta file, e.g. `AddStage`. */
  name: string;
  minArgs: number;
  maxArgs: number;
  arity: ArityKind;
  /** Scope the command must appear inside, when the registry records one. */
  requiresScope: string | undefined;
  opensScope: string | undefined;
  closesScope: string | undefined;
  conditional: boolean;
  providedByHack: string;
  usage: string;
  /** True for a `Not_`-prefixed inverse of a conditional command. */
  inverseOf: string | undefined;
}

export interface GenerateOptions {
  registries: RegistrySet;
  /** Toolkit version recorded in the file header. */
  toolkitVersion: string;
}

export interface GenerateResult {
  /** Full contents of `Game.meta.lua`, LF-terminated. */
  contents: string;
  /** SHA-256 of `contents`. */
  sha256: string;
  definitions: CommandDefinition[];
  /** Registry command records the file was generated from, by name. */
  commandNames: string[];
  upstream: { repository: string; commit: string; license: string; sha256: string | undefined };
}

/** Lua reserved words — a command named like one could not be emitted as `Game.X`. */
const LUA_KEYWORDS = new Set([
  'and',
  'break',
  'do',
  'else',
  'elseif',
  'end',
  'false',
  'for',
  'function',
  'goto',
  'if',
  'in',
  'local',
  'nil',
  'not',
  'or',
  'repeat',
  'return',
  'then',
  'true',
  'until',
  'while',
]);

/** True when `name` can be written as `Game.<name>` rather than `Game["<name>"]`. */
export function isPlainLuaIdentifier(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) && !LUA_KEYWORDS.has(name);
}

function classifyArity(minArgs: number, maxArgs: number): ArityKind {
  if (maxArgs === 0) return 'none';
  return minArgs === maxArgs ? 'exact' : 'ranged';
}

function readString(record: LoadedRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Turns registry records into the definition list, including the `Not_`
 * inverses that Game.lua registers for every conditional command.
 */
export function collectDefinitions(registries: RegistrySet): CommandDefinition[] {
  const definitions: CommandDefinition[] = [];

  for (const record of listRecords(registries, 'commands')) {
    const name = record.gameCode ?? record.displayName;
    const minArgs = Number(record['minArgs'] ?? 0);
    const maxArgs = Number(record['maxArgs'] ?? 0);
    const conditional = record['conditional'] === true;

    const base: CommandDefinition = {
      name,
      minArgs,
      maxArgs,
      arity: classifyArity(minArgs, maxArgs),
      requiresScope: readString(record, 'requiresScope'),
      opensScope: readString(record, 'opensScope'),
      closesScope: readString(record, 'closesScope'),
      conditional,
      providedByHack: readString(record, 'providedByHack') ?? 'Default',
      usage: readString(record, 'usage') ?? 'unknown',
      inverseOf: undefined,
    };
    definitions.push(base);

    // Game.lua's AddCommand registers an inverse for every conditional command,
    // so `Game.Not_IfCurrentCheckpoint` exists exactly when the base does.
    if (conditional) {
      definitions.push({ ...base, name: `Not_${name}`, inverseOf: name });
    }
  }

  return definitions.sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

/** Renders the LuaLS doc comment and signature for one command. */
function renderDefinition(definition: CommandDefinition): string[] {
  const lines: string[] = [];

  const summary = definition.inverseOf
    ? `Inverse of \`Game.${definition.inverseOf}\`. Runs its conditional block only when the condition does NOT hold.`
    : `Emits the \`${definition.name}\` script command.`;
  lines.push(`---${summary}`);
  lines.push('---');

  if (definition.requiresScope) {
    lines.push(`---**Scope:** must appear inside a \`${definition.requiresScope}\` scope.`);
  } else {
    lines.push('---**Scope:** no scope requirement recorded.');
  }
  if (definition.opensScope) lines.push(`---**Opens scope:** \`${definition.opensScope}\`.`);
  if (definition.closesScope) lines.push(`---**Closes scope:** \`${definition.closesScope}\`.`);

  const arity =
    definition.arity === 'none'
      ? 'takes no arguments'
      : definition.arity === 'exact'
        ? `takes exactly ${definition.minArgs} argument${definition.minArgs === 1 ? '' : 's'}`
        : `takes ${definition.minArgs}–${definition.maxArgs} arguments`;
  lines.push(`---**Arguments:** ${arity}.`);

  if (definition.conditional) {
    lines.push(
      '---**Conditional:** opens a conditional block. Close it with `Game.EndIf()`, not `}`.',
    );
  }

  lines.push(
    `---**Provided by:** ${
      definition.providedByHack === 'Default'
        ? 'the base game'
        : `the \`${definition.providedByHack}\` hack`
    }.`,
  );

  if (definition.usage === 'unused' || definition.usage === 'commented') {
    lines.push(
      `---**Warning:** Donut Team's documentation marks this command "${definition.usage}" — Radical's own scripts never used it in a working form. It may do nothing.`,
    );
  }

  if (definition.maxArgs > 0) {
    lines.push('---');
    lines.push(
      '---Argument names and types are NOT documented upstream, so every parameter is `any`.',
    );
  }

  const parameters: string[] = [];
  for (let index = 1; index <= definition.maxArgs; index += 1) {
    const optional = index > definition.minArgs;
    parameters.push(`arg${index}`);
    lines.push(`---@param arg${index}${optional ? '?' : ''} any`);
  }

  lines.push(`function Game.${definition.name}(${parameters.join(', ')}) end`);
  return lines;
}

export function generateDefinitions(options: GenerateOptions): GenerateResult {
  const { registries, toolkitVersion } = options;
  const definitions = collectDefinitions(registries);

  const unrepresentable = definitions.filter((d) => !isPlainLuaIdentifier(d.name));
  if (unrepresentable.length > 0) {
    // Refuse rather than emit something that will not parse.
    throw new Error(
      `Cannot emit command name(s) as a Lua field: ${unrepresentable
        .map((d) => d.name)
        .join(', ')}`,
    );
  }

  let dependency: UpstreamDependency | undefined;
  try {
    dependency = gameLuaDependency();
  } catch {
    dependency = undefined;
  }
  const gameLuaFile = dependency?.files.find((file) => file.path === 'src/Game.lua');

  const commandCount = definitions.filter((d) => d.inverseOf === undefined).length;
  const inverseCount = definitions.length - commandCount;

  const header = [
    '---@meta',
    '',
    '-- GENERATED FILE — DO NOT EDIT BY HAND.',
    '--',
    '-- Lua Language Server definitions for the Game.* mission script commands',
    "-- created at runtime by Donut Team's Game.lua.",
    '--',
    '-- Regenerate with:  sah lua-defs generate',
    '-- Verify with:      sah lua-defs check',
    '--',
    `-- Generator:        springfield-after-hours-toolkit v${toolkitVersion}`,
    `-- Derived from:     ${dependency?.repository ?? '(upstream lock unavailable)'}`,
    `-- Pinned commit:    ${dependency?.commit ?? '(unknown)'}`,
    `-- Source file:      src/Game.lua`,
    `-- Source sha256:    ${gameLuaFile?.sha256 ?? '(unknown)'}`,
    `-- Upstream licence: ${dependency?.license ?? '(unknown)'} — Copyright (c) 2022 Donut Team`,
    '--',
    `-- Commands:         ${commandCount}`,
    `-- Not_ inverses:    ${inverseCount}`,
    '--',
    '-- This file contains DERIVED METADATA (command names, argument counts and',
    '-- scope rules), not upstream source code. Game.lua itself is fetched from',
    '-- Donut Team under their MIT licence and is not redistributed here.',
    '--',
    '-- WHAT THIS FILE PROVES AND DOES NOT PROVE',
    '-- Completion and argument-count checking in your editor reflect Game.lua’s',
    '-- own command tables. They do NOT prove a script works in the game: argument',
    '-- MEANINGS are undocumented upstream, and scope rules below are documentation',
    '-- only — the language server cannot verify where in a script you called',
    '-- something. Test in the Mod Launcher.',
    '',
    'error("Meta files should not be executed.")',
    '',
    '---The table Game.lua populates with one function per script command.',
    '---@class GameCommands',
    'Game = Game or {}',
    '',
  ];

  const body: string[] = [];
  for (const definition of definitions) {
    body.push(...renderDefinition(definition), '');
  }

  // Game.lua always defines these two, outside the command tables: either the
  // real implementations when a conditional command is loaded, or stubs that
  // raise a Lua error. Either way the field exists, so an editor should know it.
  body.push(
    '---Closes a conditional block opened by a conditional command.',
    '---',
    '---Game.lua emits the opening `{` itself, so a conditional block is closed',
    '---with this call rather than with `}`.',
    '---',
    '---**Arguments:** takes no arguments.',
    '---',
    '---Defined by Game.lua outside the command tables. When no conditional',
    '---commands are loaded it exists but raises a Lua error when called.',
    'function Game.EndIf() end',
    '',
    '---Legacy inverse-conditional helper.',
    '---',
    '---**Deprecated.** Older versions of Game.lua used `Game.Not()`; current',
    '---versions register `Not_`-prefixed commands instead, which this file',
    '---generates. Retained upstream for backwards compatibility.',
    '---',
    '---**Arguments:** takes no arguments.',
    '---@deprecated',
    'function Game.Not() end',
    '',
  );

  const contents = normaliseText([...header, ...body].join('\n'));

  return {
    contents,
    sha256: sha256(contents),
    definitions,
    commandNames: definitions
      .filter((d) => d.inverseOf === undefined)
      .map((d) => d.name)
      .sort(),
    upstream: {
      repository: dependency?.repository ?? 'donutteam/game-lua',
      commit: dependency?.commit ?? '(unknown)',
      license: dependency?.license ?? 'MIT',
      sha256: gameLuaFile?.sha256,
    },
  };
}
