import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { EXIT_CODES, type ExitCode } from '@sah/core';
import {
  StarterError,
  createStarterProject,
  internalNameFor,
  planStarterProject,
} from '@sah/starter';
import {
  applyInstall,
  downloadFile,
  generateDefinitions,
  planInstall,
} from '@sah/game-lua-definitions';
import { createContext } from '../context.js';
import { askText, askYesNo, defaultIO, isInteractive, type PromptIO } from '../prompt.js';

/**
 * `sah start` — the guided way to create a mod project.
 *
 * This is the front door for someone who has never used a terminal tool before.
 * It asks understandable questions, explains each one, shows exactly what it is
 * about to write, and writes nothing until the answer is yes.
 *
 * Three rules shape the whole thing:
 *
 * 1. **Nothing is written before the preview is confirmed.** The preview is
 *    built from the same call that does the writing, so it cannot drift.
 * 2. **An existing folder is never overwritten**, with no flag to override it.
 * 3. **It never needs the game.** Creating a project is file authoring; playing
 *    it is not, and the wizard is careful never to blur the two.
 */

export interface StartOptions {
  /** Pre-supplied answers, for scripting and tests. */
  name?: string;
  author?: string;
  destination?: string;
  /** Skip the confirmation prompt. Requires the answers above. */
  yes: boolean;
  debug: boolean;
  io?: PromptIO;
}

interface Answers {
  projectName: string;
  author: string;
  destination: string;
  installDefinitions: boolean;
  installOfficial: boolean;
  includeExampleMission: boolean;
  openFolder: boolean;
}

export async function runStart(options: StartOptions): Promise<ExitCode> {
  const io = options.io ?? defaultIO();
  const write = (text = ''): void => {
    io.output.write(`${text}\n`);
  };

  write('');
  write('  Springfield After Hours Toolkit');
  write('  Let us make you a new mod project.');
  write('');
  write('  This creates a folder of files you can edit. It does not need the');
  write('  game, and it will not change anything until you say yes.');
  write('');
  write('  Press Ctrl+C at any point to stop.');

  let answers: Answers;
  try {
    answers = await collectAnswers(io, options);
  } catch {
    // Ctrl+C or end of input. Nothing has been written at this point.
    write('');
    write('Cancelled. Nothing was created.');
    return EXIT_CODES.OK;
  }

  // --- preview ---------------------------------------------------------------

  const root = path.resolve(expandHome(answers.destination));
  const planned = planStarterProject({
    projectName: answers.projectName,
    author: answers.author,
    includeExampleMission: answers.includeExampleMission,
  });

  write('');
  write('  ─────────────────────────────────────────────');
  write('  Here is exactly what will happen.');
  write('  ─────────────────────────────────────────────');
  write('');
  write(`  Project name   ${answers.projectName}`);
  write(`  Author         ${answers.author}`);
  write(`  Internal name  ${internalNameFor(answers.projectName)}`);
  write('');
  write(`  New folder     ${root}`);
  write('');
  write('  Files to be created:');
  for (const file of planned) write(`      ${file.path}`);
  if (answers.installDefinitions) {
    write('      .vscode/settings.json          (editor setup)');
    write('      Resources/lib/external/…       (Game.* autocomplete)');
  }
  write('');
  write('  Nothing outside that folder will be touched.');
  write('');

  if (!options.yes) {
    const go = await askYesNo(io, { question: 'Create it', defaultValue: true }).catch(() => false);
    if (!go) {
      write('');
      write('Cancelled. Nothing was created.');
      return EXIT_CODES.OK;
    }
  }

  // --- write -----------------------------------------------------------------

  let created;
  try {
    created = createStarterProject({
      destination: root,
      projectName: answers.projectName,
      author: answers.author,
      includeExampleMission: answers.includeExampleMission,
    });
  } catch (error) {
    if (error instanceof StarterError) {
      write('');
      write(`  Could not create the project.`);
      write('');
      write(`  ${error.message}`);
      if (error.hint) {
        write('');
        for (const line of error.hint.split('\n')) write(`  ${line}`);
      }
      if (error.nothingChanged) {
        write('');
        write('  Nothing was changed.');
      }
      write('');
      write('  Try again with:  sah start');
      return EXIT_CODES.REFUSED_OVERWRITE;
    }
    throw error;
  }

  write('');
  write(`  Created ${created.written.length} files in ${created.root}`);

  // --- editor definitions ----------------------------------------------------

  if (answers.installDefinitions) {
    write('');
    write('  Installing editor autocomplete…');
    const outcome = await installDefinitions(created.root, answers.installOfficial);
    write(`  ${outcome.ok ? '' : 'note: '}${outcome.note}`);
  }

  // --- next steps ------------------------------------------------------------

  write('');
  write('  ─────────────────────────────────────────────');
  write('  Done. Here is what to do next.');
  write('  ─────────────────────────────────────────────');
  write('');
  write('  1. Open the folder in your editor:');
  write('');
  write(`       ${created.root}`);
  write('');
  if (answers.includeExampleMission) {
    write('  2. Open  Resources/scripts/example-mission.lua  and read the comments.');
    write('     It is an authoring example, not a mission anyone has played.');
  } else {
    write('  2. Create your first script under  Resources/scripts/');
  }
  write('');
  write('  3. Read  README.md  inside the project. It explains every file and');
  write('     what to edit first.');
  write('');
  write('  Before you share the mod, run:  sah tools');
  write('');
  write('  To actually play it you will separately need a lawful copy of the');
  write("  game, Lucas' Mod Launcher, and Donut Team's Game.lua. This toolkit");
  write('  does not provide, bundle or replace any of those, and it cannot tell');
  write('  you whether your mod works in the game.');
  write('');

  if (answers.openFolder) openFolder(created.root, io);

  return EXIT_CODES.OK;
}

async function collectAnswers(io: PromptIO, options: StartOptions): Promise<Answers> {
  const projectName =
    options.name ??
    (await askText(io, {
      explanation: [
        '  What should the mod be called? This is the name players see in the',
        '  Mod Launcher list. You can change it later in Meta.ini.',
      ].join('\n'),
      question: '  Project name',
      defaultValue: 'My SHAR Mod',
      validate: (value) =>
        value.length > 120 ? 'That is very long — try something shorter.' : undefined,
    }));

  const author =
    options.author ??
    (await askText(io, {
      explanation: [
        '  Who should be credited as the author? A nickname is fine. This goes',
        '  into Meta.ini and is shown with the mod.',
      ].join('\n'),
      question: '  Author name',
      defaultValue: 'Anonymous',
    }));

  const suggested = path.join(defaultProjectParent(), slug(projectName));
  const destination =
    options.destination ??
    (await askText(io, {
      explanation: [
        '  Where should the project folder go? Press Enter for the suggestion.',
        '  The folder must not already exist — nothing will be overwritten.',
      ].join('\n'),
      question: '  Folder',
      defaultValue: suggested,
    }));

  if (options.yes) {
    // Non-interactive: sensible, documented defaults for everything not asked.
    return {
      projectName,
      author,
      destination,
      installDefinitions: true,
      installOfficial: false,
      includeExampleMission: true,
      openFolder: false,
    };
  }

  const includeExampleMission = await askYesNo(io, {
    explanation: [
      '  Include a small example mission script?',
      '',
      '  It is a commented Lua file showing how a mission is structured. It is',
      '  an authoring example — it has NOT been tested in the game.',
    ].join('\n'),
    question: '  Include the example',
    defaultValue: true,
  });

  const installDefinitions = await askYesNo(io, {
    explanation: [
      '  Set up autocomplete for the Game.* commands?',
      '',
      '  This writes editor definitions into the project so your editor can',
      '  suggest all 351 commands and check how many arguments each one takes.',
      '  Nothing is installed on your computer — only inside the project folder.',
    ].join('\n'),
    question: '  Install editor definitions',
    defaultValue: true,
  });

  const installOfficial = installDefinitions
    ? await askYesNo(io, {
        explanation: [
          "  Also download Donut Team's official Custom Files definitions?",
          '',
          '  These cover a different set of functions (Output, GetModPath and',
          '  friends). They are downloaded from Donut Team, checked against a',
          '  recorded fingerprint, and put in the project with their licence.',
          '  This needs an internet connection. Say no to skip it.',
        ].join('\n'),
        question: '  Download the official definitions too',
        defaultValue: false,
      })
    : false;

  const openFolder = isInteractive(io)
    ? await askYesNo(io, {
        explanation: '  Open the finished folder when everything is done?',
        question: '  Open the folder',
        defaultValue: false,
      })
    : false;

  return {
    projectName,
    author,
    destination,
    installDefinitions,
    installOfficial,
    includeExampleMission,
    openFolder,
  };
}

/** Installs editor definitions, reporting in plain language rather than throwing. */
async function installDefinitions(
  projectRoot: string,
  withOfficial: boolean,
): Promise<{ ok: boolean; note: string }> {
  try {
    const context = createContext();
    const generated = generateDefinitions({
      registries: context.registries,
      toolkitVersion: context.version,
    });

    const plan = await planInstall({
      projectRoot,
      definitions: generated.contents,
      withOfficial,
      download: withOfficial ? downloadFile : undefined,
    });

    if (plan.errors.length > 0) {
      return {
        ok: false,
        note: withOfficial
          ? `Could not download the official definitions (${plan.errors[0]}). Your project is fine — the Game.* autocomplete was skipped too. Run "sah definitions install ." later to retry.`
          : `Could not set up autocomplete: ${plan.errors[0]}`,
      };
    }

    applyInstall(plan);
    return {
      ok: true,
      note: withOfficial
        ? 'Autocomplete installed, including the official definitions.'
        : 'Autocomplete installed for the Game.* commands.',
    };
  } catch (error) {
    return {
      ok: false,
      note: `Autocomplete could not be set up (${(error as Error).message}). Your project was still created. Run "sah definitions install ." to try again.`,
    };
  }
}

/** A sensible parent folder for a new project on each platform. */
function defaultProjectParent(): string {
  const home = os.homedir();
  const desktop = path.join(home, 'Desktop');
  return fs.existsSync(desktop) ? desktop : home;
}

function slug(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base.length > 0 ? base : 'my-shar-mod';
}

/** Expands a leading `~`, which people type and shells only sometimes expand. */
function expandHome(input: string): string {
  if (input === '~') return os.homedir();
  if (input.startsWith('~/') || input.startsWith('~\\')) {
    return path.join(os.homedir(), input.slice(2));
  }
  return input;
}

/**
 * Opens the finished folder in the system file manager.
 *
 * Argument array, no shell — the path is user-supplied and may contain anything
 * a filename can contain. A failure here is cosmetic and never fails the run.
 */
function openFolder(root: string, io: PromptIO): void {
  const command =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
  try {
    spawnSync(command, [root], { shell: false, stdio: 'ignore', windowsHide: true });
  } catch {
    io.output.write(`  (Could not open the folder automatically — open it yourself: ${root})\n`);
  }
}
