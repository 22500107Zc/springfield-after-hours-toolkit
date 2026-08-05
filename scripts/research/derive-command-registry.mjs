#!/usr/bin/env node
/**
 * Derives data/registries/commands.yaml from Donut Team's Game.lua.
 *
 * WHY THIS EXISTS
 * ---------------
 * Game.lua's `DefaultCommands`, `ASFCommands` and `DebugTestCommands` tables
 * encode, for every script command, its argument count limits and the scope it
 * must appear inside. That is exactly the metadata the validator needs, and
 * hand-transcribing ~400 entries would guarantee errors.
 *
 * WHAT THIS DOES NOT DO
 * ---------------------
 * It does not copy Game.lua into this repository. It reads the upstream file
 * (from `vendor/` if present, otherwise fetching the pinned commit) and writes
 * a *derived metadata table* with attribution. Game.lua itself remains a
 * dependency the user fetches, under Donut Team's MIT licence.
 *
 * Usage:
 *   node scripts/research/derive-command-registry.mjs [--check]
 *
 *   --check   Fail if the generated file would differ from what is on disk.
 *             Used in CI to catch a stale registry.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const lockPath = path.join(repoRoot, 'data', 'upstream', 'upstream.lock.json');
const outputPath = path.join(repoRoot, 'data', 'registries', 'commands.yaml');

const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
const gameLua = lock.dependencies['donutteam/game-lua'];
const gameLuaFile = gameLua.files.find((f) => f.path === 'src/Game.lua');

async function readGameLua() {
  const vendored = path.join(repoRoot, 'vendor', 'donutteam', 'game-lua', 'src', 'Game.lua');
  if (fs.existsSync(vendored)) {
    return fs.readFileSync(vendored, 'utf8');
  }
  const url = `https://raw.githubusercontent.com/${gameLua.repository}/${gameLua.commit}/src/Game.lua`;
  process.stderr.write(`Game.lua not found in vendor/, fetching pinned commit...\n`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }
  return await response.text();
}

/** Extracts `local <name> = { ... }` command tables. */
function extractTable(source, name) {
  const start = source.indexOf(`local ${name} = {`);
  if (start < 0) throw new Error(`Could not find table "${name}" in Game.lua`);
  const open = source.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  return source.slice(open + 1, end);
}

/** Parses `{ Name = "X", MinArgs = 1, ... }` entries. */
function parseCommands(body) {
  const commands = [];
  const entryPattern = /\{([^{}]*)\}/g;
  let match;
  while ((match = entryPattern.exec(body)) !== null) {
    const entry = match[1];
    const field = (key) => {
      const m = new RegExp(`${key}\\s*=\\s*("([^"]*)"|true|false|\\d+)`).exec(entry);
      if (!m) return undefined;
      if (m[2] !== undefined) return m[2];
      if (m[1] === 'true') return true;
      if (m[1] === 'false') return false;
      return Number(m[1]);
    };
    const name = field('Name');
    if (typeof name !== 'string') continue;
    commands.push({
      name,
      minArgs: field('MinArgs') ?? 0,
      maxArgs: field('MaxArgs') ?? 0,
      requiresScope: field('RequiresScope'),
      opensScope: field('OpensScope'),
      closesScope: field('ClosesScope'),
      conditional: field('Conditional') === true,
    });
  }
  return commands;
}

/**
 * Usage markers ("Unused" / "Commented") from Donut Team's All Commands page.
 * Recorded here rather than parsed, because they live in prose upstream.
 * Keep in sync deliberately; anything absent is reported as "unknown".
 */
const USAGE_MARKERS = {
  unused: [
    'SetRespawnRate',
    'ActivateTrigger',
    'DeactivateTrigger',
    'SetTotalWasps',
    'AddFlyingActor',
    'SetCollisionAttributes',
    'SetHitAndRunDecayInterior',
    'GagSetLoadDistances',
    'GagSetWeight',
    'MoveStageVehicle',
    'msPlacePlayerCarAtLocatorName',
    'PlacePlayerAtLocatorName',
    'SetStageCamera',
    'AllowUserDump',
    'AddGlobalProp',
    'ClearVehicleSelectInfo',
    'CreateAnimPhysObject',
    'LinkActionToObject',
    'LinkActionToObjectJoint',
    'SetCarStartCamera',
    'SetMissionNameIndex',
    'AddBonusObjective',
    'CharacterIsChild',
    'CreateActionEventTrigger',
    'EnableHitAndRun',
    'ResetCharacter',
    'ResetHitAndRun',
    'SetBonusMissionStart',
    'SetCharacterPosition',
    'SetConversationCamDistance',
    'SetPlayerCarName',
    'SetVehicleToLoad',
  ],
  commented: [
    'AddSpawnPoint',
    'SetConversationCamPcName',
    'SetConversationCamNpcName',
    'AttachStatePropCollectible',
    'SetChaseSpawnRate',
    'SetHitAndRunMeter',
  ],
};

function usageFor(name) {
  if (USAGE_MARKERS.unused.includes(name)) return 'unused';
  if (USAGE_MARKERS.commented.includes(name)) return 'commented';
  return 'unknown';
}

/** Converts a PascalCase command name to a lower-kebab-case registry id. */
function toId(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function yamlString(value) {
  if (value === undefined || value === null) return null;
  const str = String(value);
  return /^[A-Za-z0-9_][A-Za-z0-9 _.\-/\\]*$/.test(str) ? str : JSON.stringify(str);
}

function renderRecords(commands, hack, provenanceDetail) {
  const lines = [];
  for (const cmd of commands.sort((a, b) => a.name.localeCompare(b.name))) {
    lines.push(`  - id: ${toId(cmd.name)}`);
    lines.push(`    displayName: ${cmd.name}`);
    lines.push(`    gameCode: ${cmd.name}`);
    lines.push(`    category: ${cmd.requiresScope ? yamlString(cmd.requiresScope) : 'Script'}`);
    lines.push(`    verificationStatus: verified`);
    lines.push(`    verifiedAt: '${lock.derivedAt}'`);
    lines.push(`    minArgs: ${cmd.minArgs}`);
    lines.push(`    maxArgs: ${cmd.maxArgs}`);
    if (cmd.requiresScope) lines.push(`    requiresScope: ${yamlString(cmd.requiresScope)}`);
    if (cmd.opensScope) lines.push(`    opensScope: ${yamlString(cmd.opensScope)}`);
    if (cmd.closesScope) lines.push(`    closesScope: ${yamlString(cmd.closesScope)}`);
    lines.push(`    conditional: ${cmd.conditional}`);
    lines.push(`    providedByHack: ${yamlString(hack)}`);
    lines.push(`    usage: ${usageFor(cmd.name)}`);
    lines.push(`    provenance:`);
    lines.push(`      sources:`);
    lines.push(`        - donutteam-game-lua-src`);
    lines.push(`        - dt-docs-all-console-commands`);
    lines.push(`      detail: ${JSON.stringify(provenanceDetail)}`);
    lines.push('');
  }
  return lines;
}

async function main() {
  const source = await readGameLua();

  const groups = [
    { table: 'DefaultCommands', hack: 'Default', detail: 'DefaultCommands table in src/Game.lua' },
    {
      table: 'ASFCommands',
      hack: 'AdditionalScriptFunctionality',
      detail: 'ASFCommands table in src/Game.lua',
    },
    {
      table: 'DebugTestCommands',
      hack: 'DebugTest',
      detail: 'DebugTestCommands table in src/Game.lua',
    },
  ];

  const header = [
    '# GENERATED FILE — DO NOT EDIT BY HAND.',
    '#',
    '# Regenerate with:  npm run registry:derive-commands',
    '#',
    "# Derived from the command tables in Donut Team's Game.lua",
    `# (${gameLua.repository} @ ${gameLua.commit}, src/Game.lua,`,
    `#  sha256 ${gameLuaFile.sha256}).`,
    '#',
    '# Game.lua is MIT licensed, Copyright (c) 2022 Donut Team. This file contains',
    '# DERIVED METADATA (command names, argument counts and scope rules), not the',
    '# upstream source itself. See THIRD_PARTY_NOTICES.md.',
    '',
    'version: 1',
    'registry: commands',
    'description: >-',
    '  Script commands available to generated mission and level scripts. Argument',
    "  counts and scope rules are derived mechanically from Game.lua's own command",
    '  tables. A command being listed here means it EXISTS and its arity is known —',
    '  it does not mean this toolkit knows what the arguments mean.',
    '',
    'records:',
  ];

  const body = [];
  let total = 0;
  for (const group of groups) {
    const commands = parseCommands(extractTable(source, group.table));
    total += commands.length;
    body.push(...renderRecords(commands, group.hack, group.detail));
  }

  const output = `${[...header, ...body].join('\n').replace(/\n+$/, '')}\n`;

  if (process.argv.includes('--check')) {
    const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : '';
    if (existing !== output) {
      process.stderr.write('commands.yaml is out of date. Run: npm run registry:derive-commands\n');
      process.exit(1);
    }
    process.stdout.write(`commands.yaml is up to date (${total} commands).\n`);
    return;
  }

  fs.writeFileSync(outputPath, output, 'utf8');
  process.stdout.write(`Wrote ${outputPath} (${total} commands).\n`);
}

await main();
