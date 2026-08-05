#!/usr/bin/env node
/**
 * Derives data/registries/characters.yaml from Donut Team's Characters page.
 *
 * WHY THIS EXISTS
 * ---------------
 * Dialogue character codes ("Brt" for Bart, "Cbg" for Comic Book Guy) are
 * exactly the kind of detail a human transcribes wrongly and a language model
 * invents confidently. Deriving them from the published table means the registry
 * is right by construction, and re-running the script proves it is still right.
 *
 * WHAT IS AND IS NOT VERIFIED HERE
 * --------------------------------
 * Verified: the dialogue code, the internal name, the non-generic index and the
 * outfit list, because the page states them.
 * NOT verified: whether any given character can be placed in any given mission,
 * which depends on level scripts this toolkit has not read.
 *
 * Usage:
 *   node scripts/research/derive-character-registry.mjs [--check]
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const outputPath = path.join(repoRoot, 'data', 'registries', 'characters.yaml');
const SOURCE_URL = 'https://docs.donutteam.com/docs/TheSimpsonsHitAndRun/Characters';
const RETRIEVED_AT = '2026-08-05';

/** Display names for characters whose internal name is not self-explanatory. */
const DISPLAY_NAMES = {
  homer: 'Homer Simpson',
  marge: 'Marge Simpson',
  bart: 'Bart Simpson',
  lisa: 'Lisa Simpson',
  askinner: 'Agnes Skinner',
  beeman: 'Bumblebee Man',
  cbg: 'Comic Book Guy',
  nriviera: 'Dr. Nick Riviera',
  ned: 'Ned Flanders',
  grandpa: 'Grampa Simpson',
  moleman: 'Hans Moleman',
  captain: 'Sea Captain',
  teen: 'Squeaky-Voiced Teen',
  brockman: 'Kent Brockman',
  homerbrain: "Homer's Brain",
  willie: 'Groundskeeper Willie',
  wiggum: 'Chief Wiggum',
  lou: 'Lou',
  louie: 'Louie',
  quimby: 'Mayor Quimby',
  smithers: 'Waylon Smithers',
  burns: 'Mr. Burns',
  hibbert: 'Dr. Hibbert',
  skinner: 'Principal Skinner',
  frink: 'Professor Frink',
  snake: 'Snake Jailbird',
  otto: 'Otto Mann',
  kearney: 'Kearney Zzyzwicz',
  dolph: 'Dolph Starbeam',
  jasper: 'Jasper Beardly',
  cletus: 'Cletus Spuckler',
  barney: 'Barney Gumble',
  apu: 'Apu Nahasapeemapetilon',
  krusty: 'Krusty the Clown',
  milhouse: 'Milhouse Van Houten',
  nelson: 'Nelson Muntz',
  ralph: 'Ralph Wiggum',
  patty: 'Patty Bouvier',
  selma: 'Selma Bouvier',
  moe: 'Moe Szyslak',
  lenny: 'Lenny Leonard',
  carl: 'Carl Carlson',
  gil: 'Gil Gunderson',
  kang: 'Kang',
  kodos: 'Kodos',
  rod: 'Rod Flanders',
  todd: 'Todd Flanders',
};

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function displayNameFor(internalName) {
  return DISPLAY_NAMES[internalName] ?? titleCase(internalName);
}

/** Registry ids are lower-kebab-case; internal names use no separators already. */
function toId(internalName) {
  return internalName.replace(/_/g, '-').toLowerCase();
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function parseTables(html) {
  const tables = [];
  const tablePattern = /<table>([\s\S]*?)<\/table>/g;
  let match;
  while ((match = tablePattern.exec(html)) !== null) {
    const rows = [];
    const rowPattern = /<tr>([\s\S]*?)<\/tr>/g;
    let rowMatch;
    while ((rowMatch = rowPattern.exec(match[1])) !== null) {
      const cells = [...rowMatch[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map((c) =>
        decodeEntities(c[1].replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '')).trim(),
      );
      if (cells.length > 0) rows.push(cells);
    }
    if (rows.length > 0) tables.push(rows);
  }
  return tables;
}

function yamlList(indent, values) {
  if (values.length === 0) return `${indent}[]`;
  return `\n${values.map((v) => `${indent}  - ${v}`).join('\n')}`;
}

function renderRecord(record) {
  const lines = [];
  lines.push(`  - id: ${record.id}`);
  lines.push(`    displayName: ${JSON.stringify(record.displayName)}`);
  lines.push(`    gameCode: ${record.internalName}`);
  lines.push(`    category: ${record.generic ? 'generic' : 'non-generic'}`);
  lines.push(`    dialogueCode: ${record.dialogueCode}`);
  if (record.index !== undefined) lines.push(`    characterIndex: ${record.index}`);
  lines.push(`    generic: ${record.generic}`);
  lines.push(`    verificationStatus: verified`);
  lines.push(`    verifiedAt: '${RETRIEVED_AT}'`);
  lines.push(`    aliases:${yamlList('    ', [record.internalName, record.dialogueCode])}`);
  lines.push(`    outfits:${yamlList('    ', record.outfits)}`);
  lines.push(
    `    tags:${yamlList('    ', ['character', record.generic ? 'generic' : 'non-generic'])}`,
  );
  lines.push(`    provenance:`);
  lines.push(`      sources:`);
  lines.push(`        - dt-docs-characters`);
  lines.push(
    `      detail: ${JSON.stringify(
      `${record.generic ? 'Generic' : 'Non-generic'} Characters table`,
    )}`,
  );
  lines.push(`    notes:`);
  lines.push(
    `      - "Dialogue code and internal name are verified. Whether this character can be placed in a given mission is NOT verified by this record."`,
  );
  lines.push('');
  return lines;
}

async function main() {
  const response = await fetch(SOURCE_URL, {
    headers: { 'user-agent': 'springfield-after-hours-toolkit registry importer' },
  });
  if (!response.ok) throw new Error(`Failed to fetch ${SOURCE_URL}: HTTP ${response.status}`);
  const html = await response.text();

  const tables = parseTables(html);
  if (tables.length < 2) {
    throw new Error(
      `Expected at least 2 tables on the Characters page, found ${tables.length}. ` +
        'The upstream page layout may have changed; do not guess — inspect it.',
    );
  }

  const records = [];
  const seen = new Set();

  // Table 0: Non-generic (Dialogue Code, Internal Name, Index, Outfits)
  for (const row of tables[0]) {
    const [dialogueCode, internalName, index, outfits] = row;
    if (!dialogueCode || !internalName) continue;
    const id = toId(internalName);
    if (seen.has(id)) continue;
    seen.add(id);
    records.push({
      id,
      internalName,
      dialogueCode,
      displayName: displayNameFor(internalName),
      index: index && /^\d+$/.test(index) ? Number(index) : undefined,
      outfits: outfits
        ? outfits
            .split('\n')
            .map((o) => o.trim())
            .filter(Boolean)
        : [],
      generic: false,
    });
  }

  // Table 1: Generic (Dialogue Code, Internal Name, Outfits)
  for (const row of tables[1]) {
    const [dialogueCode, internalName, outfits] = row;
    if (!dialogueCode || !internalName) continue;
    const id = toId(internalName);
    if (seen.has(id)) continue;
    seen.add(id);
    records.push({
      id,
      internalName,
      dialogueCode,
      displayName: displayNameFor(internalName),
      index: undefined,
      outfits: outfits
        ? outfits
            .split('\n')
            .map((o) => o.trim())
            .filter(Boolean)
        : [],
      generic: true,
    });
  }

  records.sort((a, b) => a.id.localeCompare(b.id));

  const header = [
    '# GENERATED FILE — DO NOT EDIT BY HAND.',
    '#',
    '# Regenerate with:  node scripts/research/derive-character-registry.mjs',
    '#',
    `# Derived from ${SOURCE_URL}`,
    `# retrieved ${RETRIEVED_AT}.`,
    '#',
    '# Cited, not reproduced: this file records identifiers and their meanings,',
    '# which are facts about the game, not creative content.',
    '',
    'version: 1',
    'registry: characters',
    'description: >-',
    "  Characters and their dialogue codes, as published in Donut Team's",
    '  documentation. A record here proves the character code EXISTS. It does not',
    '  prove the character can be used in any particular mission or location —',
    '  that depends on level scripts this toolkit has not verified.',
    '',
    'records:',
  ];

  const body = records.flatMap(renderRecord);
  const output = `${[...header, ...body].join('\n').replace(/\n+$/, '')}\n`;

  if (process.argv.includes('--check')) {
    const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : '';
    if (existing !== output) {
      process.stderr.write('characters.yaml is out of date.\n');
      process.exit(1);
    }
    process.stdout.write(`characters.yaml is up to date (${records.length} characters).\n`);
    return;
  }

  fs.writeFileSync(outputPath, output, 'utf8');
  process.stdout.write(`Wrote ${outputPath} (${records.length} characters).\n`);
}

await main();
