import fs from 'node:fs';
import path from 'node:path';
import { EXIT_CODES, resolveWithin, type ExitCode } from '@sah/core';
import { IdSchema } from '@sah/schemas';
import { printError, printJson, printLine } from '../output.js';

/**
 * Scaffolding commands: `sah campaign new`, `sah mission new`, `sah dialogue new`.
 *
 * These write a file and tell you what to do next. They never modify
 * `campaign.yaml` automatically — the author decides what belongs in their
 * campaign, and a scaffolder silently editing the root document is exactly the
 * kind of surprise that erodes trust in a tool.
 */

export type ScaffoldKind = 'mission' | 'dialogue';

export interface ScaffoldOptions {
  kind: ScaffoldKind;
  id: string;
  title?: string;
  campaignRoot: string;
  force: boolean;
  json: boolean;
}

export function runScaffold(options: ScaffoldOptions): ExitCode {
  const idCheck = IdSchema.safeParse(options.id);
  if (!idCheck.success) {
    printError(
      `Invalid id "${options.id}": ${idCheck.error.issues.map((i) => i.message).join('; ')}`,
    );
    return EXIT_CODES.USAGE;
  }

  const root = path.resolve(options.campaignRoot);
  if (!fs.existsSync(root)) {
    printError(`Campaign directory does not exist: ${root}`);
    return EXIT_CODES.NOT_FOUND;
  }

  const title = options.title ?? toTitle(options.id);
  const relativePath =
    options.kind === 'mission' ? `missions/${options.id}.yaml` : `dialogue/${options.id}.yaml`;

  const safety = resolveWithin(root, relativePath);
  if (!safety.safe) {
    printError(`Refusing to write outside the campaign: ${safety.reason}`);
    return EXIT_CODES.USAGE;
  }

  if (fs.existsSync(safety.resolved) && !options.force) {
    printError(`${relativePath} already exists. Re-run with --force to overwrite.`);
    return EXIT_CODES.REFUSED_OVERWRITE;
  }

  const contents =
    options.kind === 'mission'
      ? missionTemplate(options.id, title)
      : dialogueTemplate(options.id, title);

  fs.mkdirSync(path.dirname(safety.resolved), { recursive: true });
  fs.writeFileSync(safety.resolved, contents, 'utf8');

  const configKey = options.kind === 'mission' ? 'missionFiles' : 'dialogueFiles';

  if (options.json) {
    printJson({
      ok: true,
      command: `${options.kind} new`,
      file: relativePath,
      nextStep: `Add "${relativePath}" to campaign.${configKey} in campaign.yaml.`,
    });
    return EXIT_CODES.OK;
  }

  printLine(`Created ${relativePath}`);
  printLine();
  printLine('It is not part of your campaign yet. Add it to campaign.yaml:');
  printLine();
  printLine(`  ${configKey}:`);
  printLine(`    - ${relativePath}`);
  printLine();
  printLine('Then run "sah validate ." to check it.');
  return EXIT_CODES.OK;
}

function toTitle(id: string): string {
  return id
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function missionTemplate(id: string, title: string): string {
  return `version: 1

mission:
  id: ${id}
  title: ${title}
  # The mission's script name, e.g. "m0". Must be short and alphanumeric.
  gameMissionName: m0
  # Must resolve in the level registry: sah registry search level
  level: level01
  # Must resolve in the locator registry: sah registry search locator
  resetPlayerInCarLocator: level1-carstart
  # Be honest. "planned" until it has actually been tested in the game.
  status: planned

  stages:
    - id: ${id}-stage-1
      title: First stage
      resetToHere: true
      objective:
        # "dummy" is the only objective the toolkit can currently generate with
        # no unverified parameters. Others fail validation with an explanation.
        type: dummy

  notes:
    - 'Scaffolded by "sah mission new". Replace the placeholder objective once the registry has verified records for the content you need.'
`;
}

function dialogueTemplate(id: string, title: string): string {
  return `version: 1

conversations:
  - id: ${id}
    title: ${title}
    status: planned
    lines:
      - id: ${id}-line-1
        order: 1
        # Speakers must resolve in the character registry.
        # Try: sah registry search character bart
        speaker: bart
        text: Replace this placeholder line.
        # Audio is optional. Supply your OWN recordings only — never extract or
        # redistribute the game's audio.
        # audio: assets/audio/${id}-line-1.wav
`;
}
