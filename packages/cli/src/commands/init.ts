import fs from 'node:fs';
import path from 'node:path';
import { EXIT_CODES, resolveWithin, type ExitCode } from '@sah/core';
import { printJson, printLine } from '../output.js';

/**
 * `sah init` — creates a new campaign workspace.
 *
 * Refuses to overwrite anything without `--force`. The generated workspace
 * validates cleanly out of the box, so a new author's first `sah validate`
 * succeeds rather than dumping errors they did not cause.
 */

export interface InitOptions {
  directory: string;
  id: string;
  title: string;
  force: boolean;
  json: boolean;
}

interface PlannedFile {
  relativePath: string;
  contents: string;
}

export function runInit(options: InitOptions): ExitCode {
  const root = path.resolve(options.directory);
  const files = planWorkspace(options);

  const existing = files
    .map((file) => file.relativePath)
    .filter((relative) => fs.existsSync(path.join(root, relative)));

  if (existing.length > 0 && !options.force) {
    const message = `Refusing to overwrite ${existing.length} existing file(s): ${existing.join(', ')}`;
    if (options.json) {
      printJson({
        ok: false,
        command: 'init',
        error: message,
        existingFiles: existing,
        hint: 'Re-run with --force to overwrite.',
      });
    } else {
      process.stderr.write(`${message}\n`);
      process.stderr.write('Re-run with --force if you meant to overwrite them.\n');
    }
    return EXIT_CODES.REFUSED_OVERWRITE;
  }

  for (const file of files) {
    const safety = resolveWithin(root, file.relativePath);
    if (!safety.safe) {
      throw new Error(`Refusing to write outside the workspace: ${file.relativePath}`);
    }
    fs.mkdirSync(path.dirname(safety.resolved), { recursive: true });
    fs.writeFileSync(safety.resolved, file.contents, 'utf8');
  }

  // Directories that are meaningful even while empty.
  for (const directory of ['Resources', 'presets', 'assets']) {
    fs.mkdirSync(path.join(root, directory), { recursive: true });
  }

  if (options.json) {
    printJson({
      ok: true,
      command: 'init',
      directory: root,
      created: files.map((f) => f.relativePath).sort(),
    });
    return EXIT_CODES.OK;
  }

  printLine(`Created a campaign workspace in ${root}`);
  printLine();
  for (const file of files.map((f) => f.relativePath).sort()) printLine(`  ${file}`);
  printLine();
  printLine('Next:');
  printLine(`  sah validate ${options.directory}`);
  printLine(`  sah build ${options.directory} --dry-run`);
  return EXIT_CODES.OK;
}

function planWorkspace(options: InitOptions): PlannedFile[] {
  const { id, title } = options;
  const internalName = id
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  return [
    {
      relativePath: 'campaign.yaml',
      contents: `version: 1

campaign:
  id: ${id}
  title: ${title}
  version: 0.1.0
  internalName: ${internalName}
  description: >-
    A campaign for The Simpsons: Hit & Run, authored with the Springfield After
    Hours Toolkit.

  # Be honest here. "planned" is the right answer until something has actually
  # been tested in the game.
  status: planned

  authors:
    - name: Your Name
      credits: true

  compatibility:
    modLauncher: required
    requiredLauncherVersion: '1.27'

  requiredHacks:
    - custom-files

  missionFiles:
    - missions/first-mission.yaml

  dialogueFiles:
    - dialogue/first-conversation.yaml

  presetFiles: []

  assetDirectories: []
`,
    },
    {
      relativePath: 'missions/first-mission.yaml',
      contents: `version: 1

# Your first mission.
#
# It uses the "dummy" objective because that is the only objective this toolkit
# can generate with no unverified parameters. Swap it for something else once
# the registry has verified records for the content you need — until then,
# "sah validate" will tell you exactly what is missing.

mission:
  id: first-mission
  title: First Mission
  # The name written into the generated script, e.g. "m0".
  gameMissionName: m0
  level: level01
  resetPlayerInCarLocator: level1-carstart
  status: planned

  stages:
    - id: first-stage
      title: The opening stage
      resetToHere: true
      objective:
        type: dummy
`,
    },
    {
      relativePath: 'dialogue/first-conversation.yaml',
      contents: `version: 1

# Dialogue is authored structurally. The toolkit validates speakers against the
# verified character registry, then exports structured data plus a report of the
# manual steps that remain. It does not guess at the game's dialogue file
# formats.

conversations:
  - id: first-conversation
    title: An opening exchange
    status: planned
    lines:
      - id: line-1
        order: 1
        # Speakers must resolve in the character registry.
        # Try: sah registry search character bart
        speaker: bart
        text: Placeholder line. Replace me.
`,
    },
    {
      relativePath: 'sah.config.json',
      contents: `${JSON.stringify(
        {
          $comment:
            'Campaign-local configuration. Safe to commit. Never put an API key here — the toolkit reads ANTHROPIC_API_KEY from the environment only.',
          buildDirectory: 'build',
        },
        null,
        2,
      )}\n`,
    },
    {
      relativePath: '.gitignore',
      contents: `# Build output is generated; do not commit it.
build/

# Local overrides and secrets.
sah.local.json
.env
`,
    },
    {
      relativePath: 'README.md',
      contents: `# ${title}

A campaign for *The Simpsons: Hit & Run*, authored with the
[Springfield After Hours Toolkit](https://github.com/22500107zc/springfield-after-hours-toolkit).

## Layout

| Path | What it is |
| --- | --- |
| \`campaign.yaml\` | The campaign root: metadata, compatibility, and the list of other files. |
| \`missions/\` | One file per mission. Stages and objectives live here. |
| \`dialogue/\` | Conversations, validated against the character registry. |
| \`presets/\` | Night preset manifests, if you use any. |
| \`assets/\` | **Your own** assets. Never put game files or other people's mod files here. |
| \`Resources/\` | Files copied into the built mod, such as upstream Lua libraries. |
| \`sah.config.json\` | Campaign-local configuration. |
| \`build/\` | Generated output. Never edit it; it is overwritten on every build. |

## Commands

\`\`\`sh
sah validate .          # check everything, exit non-zero on errors
sah build . --dry-run   # see what would be generated
sah build .             # write the mod into build/
sah package .           # zip the built mod for distribution
\`\`\`

## A note on what will fail, and why

References to Springfield locations, locators and vehicles will fail validation
unless the toolkit has a **verified** registry record for them. That is
deliberate: a mod that references a locator which does not exist produces a
mission that cannot be completed, and finding that out at build time is much
cheaper than finding it out in the game.

Run \`sah registry search <kind> <name>\` to see what is verified.

## Legal

This campaign must not contain the game, its assets, extracted audio, proprietary
map files, or assets from other people's mods. Ship only your own work and things
you have the right to distribute.
`,
    },
  ];
}
