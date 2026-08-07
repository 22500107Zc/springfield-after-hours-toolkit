import { normaliseText } from '@sah/core';

/**
 * The starter mod project.
 *
 * This is deliberately a *Mod Launcher mod folder*, not a toolkit campaign
 * workspace. `sah init` makes the latter — YAML the compiler turns into a mod.
 * A beginner running `sah start` wants the thing they can open, edit and
 * eventually load, so that is what this produces.
 *
 * Everything here is **pure**: options in, a list of files out. Nothing touches
 * the filesystem, which is what makes the wizard's preview honest — the preview
 * and the write come from the same call.
 *
 * **What this does not do.** It writes a folder that is structurally valid
 * against Donut Team's documented formats. It cannot and does not verify that
 * the result loads in the game — nobody who built this owns a copy. Every
 * generated file says so where a reader will see it.
 */

export interface StarterOptions {
  /** Human-facing mod name, e.g. "Night Shift". */
  projectName: string;
  /** Author name written into Meta.ini. */
  author: string;
  /** Include a commented example mission script. */
  includeExampleMission: boolean;
}

export interface PlannedFile {
  /** POSIX-relative path inside the project folder. */
  path: string;
  contents: string;
}

/**
 * Derives the Mod Launcher `InternalName` from a display name.
 *
 * The documented field is an identifier, so anything that is not a letter or
 * digit is dropped rather than guessed at. A name that reduces to nothing falls
 * back to a fixed value instead of producing an empty key.
 */
export function internalNameFor(projectName: string): string {
  const cleaned = projectName
    .normalize('NFD')
    // Strip combining marks so "Niveau Spécial" becomes "NiveauSpecial".
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '');
  return cleaned.length > 0 ? cleaned : 'MySharMod';
}

/** Escapes a value for an INI field, matching the documented `\n` form. */
function iniValue(value: string): string {
  return value.replace(/\r?\n/g, '\\n');
}

/** The mod-relative path of the example mission script. */
export const EXAMPLE_MISSION_PATH = 'Resources/scripts/example-mission.lua';

/** The game path the example script is registered against. */
export const EXAMPLE_GAME_PATH = 'scripts\\missions\\level01\\m0i.mfk';

export function planStarterProject(options: StarterOptions): PlannedFile[] {
  const internalName = internalNameFor(options.projectName);
  const files: PlannedFile[] = [];

  files.push({ path: 'Meta.ini', contents: metaIni(options, internalName) });
  files.push({ path: 'CustomFiles.ini', contents: customFilesIni(options) });
  files.push({ path: 'CustomFiles.lua', contents: customFilesLua(options) });
  files.push({ path: 'README.md', contents: projectReadme(options, internalName) });
  files.push({ path: '.gitignore', contents: gitignore() });

  if (options.includeExampleMission) {
    files.push({ path: EXAMPLE_MISSION_PATH, contents: exampleMission(options) });
  }

  // Sorted so the preview, the write and the tests all agree on order.
  return files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/** Directories worth creating even when empty, so the layout is obvious. */
export const STARTER_DIRECTORIES = ['Resources', 'Resources/scripts', 'Resources/lib'] as const;

function metaIni(options: StarterOptions, internalName: string): string {
  // Keys and their order follow Donut Team's "Configuring Mods" documentation.
  // Only fields whose meaning is documented are written — no invented keys.
  return normaliseText(
    [
      '; Meta.ini — how the Mod Launcher describes your mod.',
      '; Edit Title, Description and Author freely. InternalName should stay',
      '; unique to your mod; other mods sharing it can collide.',
      '',
      '[Miscellaneous]',
      `Title=${iniValue(options.projectName)}`,
      `InternalName=${internalName}`,
      `Description=${iniValue(`${options.projectName}, a mod for The Simpsons: Hit & Run.`)}`,
      'Version=0.1.0',
      'Main=0',
      'SupportsEnglish=1',
      'SupportsDemo=0',
      'SupportsInternational=0',
      'SupportsBestSellerSeries=0',
      '',
      '[Author]',
      `Name=${iniValue(options.author)}`,
      'Credits=1',
    ].join('\n'),
  );
}

function customFilesIni(options: StarterOptions): string {
  const lines = [
    '; CustomFiles.ini — tells the Custom Files hack which game paths your mod',
    '; handles. Keys are game paths and use DOUBLED backslashes.',
    '',
    '; Tip: run `sah pocket path <this folder> <a file>` to get any path in the',
    '; exact form each file needs.',
  ];

  if (options.includeExampleMission) {
    lines.push(
      '',
      '[PathHandlers]',
      `${EXAMPLE_GAME_PATH.replace(/\\/g, '\\\\')}=${EXAMPLE_MISSION_PATH}`,
    );
  } else {
    lines.push(
      '',
      '; No path handlers yet. Add one like this once you have a script:',
      `; ${EXAMPLE_GAME_PATH.replace(/\\/g, '\\\\')}=${EXAMPLE_MISSION_PATH}`,
      '',
      '[PathHandlers]',
    );
  }

  return normaliseText(lines.join('\n'));
}

function customFilesLua(options: StarterOptions): string {
  return normaliseText(
    [
      '-- CustomFiles.lua — runs when your mod loads.',
      `-- Project: ${options.projectName}`,
      '',
      '-- Your mission scripts call functions on a global `Game` table. That table',
      "-- is created at runtime by Donut Team's Game.lua, which is NOT included",
      "-- here: this toolkit does not redistribute anyone else's files.",
      '--',
      '-- To make the mod actually run you need Game.lua from',
      '--   https://github.com/donutteam/game-lua  (MIT)',
      '-- saved as  Resources/lib/Game.lua  inside this folder.',
      '--',
      '-- Until then you can still write and edit scripts — editor autocomplete',
      '-- works without it. See README.md.',
      '',
      'dofile(GetModPath() .. "/Resources/lib/Game.lua")',
    ].join('\n'),
  );
}

function exampleMission(options: StarterOptions): string {
  return normaliseText(
    [
      '--[[',
      `  Example mission script for ${options.projectName}.`,
      '',
      '  THIS IS AN AUTHORING EXAMPLE, NOT A GAME-VERIFIED MISSION.',
      '',
      '  It shows the shape of a Game.lua mission script and uses only commands',
      "  that exist in Game.lua's own command tables. It has NOT been loaded or",
      '  completed in The Simpsons: Hit & Run by anyone who wrote this toolkit,',
      '  and it is not a claim that the mission works or can be finished.',
      '',
      '  Treat it as a starting point to edit, not as a working mission.',
      ']]',
      '',
      '-- Every mission opens a Mission scope and closes it again.',
      'Game.SelectMission("m0")',
      '',
      '\t-- A Stage groups the objectives the player does next.',
      '\tGame.AddStage()',
      '',
      '\t\t-- RESET_TO_HERE marks where the player restarts after failing.',
      '\t\tGame.RESET_TO_HERE()',
      '',
      '\t\t-- "dummy" is the documented no-op objective. It is the only objective',
      '\t\t-- this toolkit will generate, because the parameters of the others are',
      '\t\t-- not documented anywhere it has read. Replace it as you learn more.',
      '\t\tGame.AddObjective("dummy")',
      '\t\tGame.CloseObjective()',
      '',
      '\tGame.CloseStage()',
      '',
      'Game.CloseMission()',
    ].join('\n'),
  );
}

function projectReadme(options: StarterOptions, internalName: string): string {
  return normaliseText(
    [
      `# ${options.projectName}`,
      '',
      `A mod project for _The Simpsons: Hit & Run_, created with the Springfield`,
      'After Hours Toolkit.',
      '',
      `**Author:** ${options.author}`,
      '',
      '---',
      '',
      '## What is in this folder',
      '',
      '| File | What it is | Edit it? |',
      '| ---- | ---------- | -------- |',
      '| `Meta.ini` | How the Mod Launcher lists your mod | Yes — title, description, author |',
      '| `CustomFiles.ini` | Which game paths your mod handles | Yes, as you add scripts |',
      '| `CustomFiles.lua` | Runs when the mod loads | Rarely |',
      ...(options.includeExampleMission
        ? [
            `| \`${EXAMPLE_MISSION_PATH}\` | An example mission script | Yes — this is your starting point |`,
          ]
        : []),
      '| `Resources/lib/` | Where `Game.lua` goes (not included) | Put `Game.lua` here |',
      '',
      '## What to edit first',
      '',
      '1. Open `Meta.ini` and change `Title` and `Description`.',
      ...(options.includeExampleMission
        ? [
            `2. Open \`${EXAMPLE_MISSION_PATH}\` and read the comments.`,
            '3. Change something small — the stage structure is the part to learn.',
          ]
        : [
            '2. Create a script under `Resources/scripts/`.',
            '3. Register it in `CustomFiles.ini` under `[PathHandlers]`.',
          ]),
      '',
      '## Writing Lua with autocomplete',
      '',
      'Open this folder in an editor with the **Lua Language Server** extension',
      '(`sumneko.lua` in VS Code). If you let the toolkit install definitions, you',
      "get completion for the `Game.*` commands, with each one's argument count",
      'and required scope in the hover text.',
      '',
      'To install or re-install them later:',
      '',
      '```',
      'sah definitions install .',
      '```',
      '',
      '## Actually running the mod',
      '',
      'Three things are needed, and this toolkit provides none of them, on',
      'purpose — they belong to other people:',
      '',
      '1. **A lawful copy of the game.**',
      "2. **Lucas' Simpsons: Hit & Run Mod Launcher** (Windows).",
      '3. **`Game.lua`** from <https://github.com/donutteam/game-lua> (MIT), saved',
      '   as `Resources/lib/Game.lua` in this folder.',
      '',
      '> **This toolkit prepares and inspects files. It cannot tell you whether',
      '> your mod works in the game.** Nothing here has been run in _The Simpsons:',
      '> Hit & Run_. Structurally valid is not the same as working — only loading',
      '> it in the Mod Launcher can tell you that.',
      '',
      '## Before you share it',
      '',
      '```',
      'sah tools',
      '```',
      '',
      'Pick **Check filename capitalization** — it catches paths that work on your',
      'machine and break for everyone else. Then pick **Create a clean release',
      'copy** to get a folder without `.DS_Store` and other clutter, and zip that.',
      '',
      '---',
      '',
      `Internal name: \`${internalName}\``,
      '',
      'This project is yours. The toolkit that generated it is MIT licensed and is',
      'not affiliated with Electronic Arts, Disney, Fox, Radical Entertainment or',
      'Donut Team.',
    ].join('\n'),
  );
}

function gitignore(): string {
  return normaliseText(
    [
      '# macOS clutter',
      '.DS_Store',
      '._*',
      '__MACOSX/',
      '',
      '# Editor and temporary files',
      '*~',
      '*.bak',
      '*.tmp',
      '',
      '# Build output',
      'build/',
      'dist/',
    ].join('\n'),
  );
}
