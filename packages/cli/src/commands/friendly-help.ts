import { EXIT_CODES, type ExitCode } from '@sah/core';
import { printLine } from '../output.js';

/**
 * `sah help` — help for someone who has never used this before.
 *
 * `sah --help` lists every command with its flags, which is right for people
 * who already know what they are looking for and useless for people who do not.
 * This answers the actual first questions: what is this, what can I do with it,
 * and what do I type right now.
 */
export function runFriendlyHelp(): ExitCode {
  const lines = [
    '',
    '  Springfield After Hours Toolkit',
    '',
    '  Tools for making and preparing mods for The Simpsons: Hit & Run.',
    '  Everything here works on files. None of it needs the game installed.',
    '',
    '  ─────────────────────────────────────────────────────────',
    '  If you are new, type this:',
    '',
    '      sah start',
    '',
    '  It asks a few plain questions and creates a mod project folder',
    '  for you, with autocomplete set up for your editor.',
    '  ─────────────────────────────────────────────────────────',
    '',
    '  The three things you will use most',
    '',
    '      sah start          Create a new mod project, step by step.',
    '',
    '      sah tools          Six jobs you do to a mod folder, as a menu:',
    '                         check capitalization, make a clean copy to',
    '                         upload, compare mods, record what you shipped,',
    '                         compare two releases, convert a path.',
    '',
    '      sah definitions install .',
    '                         Add Game.* autocomplete to a project you',
    '                         already have.',
    '',
    '  What this does NOT do',
    '',
    '      It does not include the game, and never will.',
    "      It does not include Lucas' Mod Launcher.",
    '      It cannot tell you whether your mod works when you play it.',
    '',
    '      Making a mod and testing a mod are different jobs. This toolkit',
    '      does the first one. For the second you need a lawful copy of the',
    "      game and Lucas' Mod Launcher, on Windows.",
    '',
    '  If something goes wrong',
    '',
    '      Add --debug to any command for the technical detail.',
    '      Every command also takes --json if you are scripting it.',
    '',
    '  For everything else',
    '',
    '      sah --help         The full command list, with all options.',
    '',
    '  Documentation and downloads:',
    '  https://github.com/22500107Zc/springfield-after-hours-toolkit',
    '',
  ];

  for (const line of lines) printLine(line);
  return EXIT_CODES.OK;
}
