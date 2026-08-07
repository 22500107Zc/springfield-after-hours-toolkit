import { EXIT_CODES, type ExitCode } from '@sah/core';
import { askMenu, askText, askYesNo, defaultIO, type PromptIO } from '../prompt.js';
import {
  runPocketCaseCheck,
  runPocketCleanExport,
  runPocketConflicts,
  runPocketDiff,
  runPocketManifest,
  runPocketPath,
} from './pocket.js';

/**
 * `sah tools` — the six Pocket Tools, as a numbered menu.
 *
 * Nobody should have to memorise `sah pocket clean-export <src> <dest>` to tidy
 * a folder before uploading it. This asks for the same information in
 * sentences, then calls **exactly the same functions** the flag-driven commands
 * call — there is no second implementation to drift.
 *
 * `sah pocket …` is untouched and remains the scriptable surface.
 */

type ToolId = 'case' | 'clean' | 'conflicts' | 'manifest' | 'diff' | 'path';

export interface ToolsMenuOptions {
  io?: PromptIO;
  debug: boolean;
}

export async function runToolsMenu(options: ToolsMenuOptions): Promise<ExitCode> {
  const io = options.io ?? defaultIO();
  const write = (text = ''): void => {
    io.output.write(`${text}\n`);
  };

  write('');
  write('  SHAR Pocket Tools');
  write('');
  write('  Six small jobs you do to a mod folder. Every one of them looks at');
  write('  files only — none of them needs the game.');

  let choice: ToolId;
  try {
    choice = await askMenu<ToolId>(io, {
      question: '  Which one',
      choices: [
        {
          label: 'Check filename capitalization',
          value: 'case',
          description: 'Finds names that work on your machine and break for others.',
        },
        {
          label: 'Create a clean release copy',
          value: 'clean',
          description: 'Copies your mod without .DS_Store and other clutter.',
        },
        {
          label: 'Compare mods for possible file conflicts',
          value: 'conflicts',
          description: 'Shows paths that more than one mod supplies.',
        },
        {
          label: 'Create a file manifest',
          value: 'manifest',
          description: 'Records every file and its fingerprint.',
        },
        {
          label: 'Compare two releases',
          value: 'diff',
          description: 'What was added, removed, changed or renamed.',
        },
        {
          label: 'Copy a Windows-style mod path',
          value: 'path',
          description: 'Gets a path in the exact form each mod file needs.',
        },
      ],
    });
  } catch {
    write('');
    write('Cancelled. Nothing was changed.');
    return EXIT_CODES.OK;
  }

  write('');
  write('  Tip: you can drag a folder from your file manager into this window');
  write('  to fill in its path.');

  try {
    switch (choice) {
      case 'case':
        return runPocketCaseCheck({
          directory: await askFolder(io, 'Which mod folder should I check'),
          references: true,
          json: false,
        });

      case 'clean': {
        const source = await askFolder(io, 'Which mod folder should I copy');
        const destination = await askText(io, {
          explanation: [
            '  Where should the clean copy go? This must be a new folder —',
            '  your original is never modified.',
          ].join('\n'),
          question: '  New folder for the clean copy',
        });
        return runPocketCleanExport({
          source,
          destination: stripQuotes(destination),
          inPlace: false,
          yes: false,
          force: false,
          json: false,
        });
      }

      case 'conflicts': {
        const a = await askFolder(io, 'First mod folder');
        const b = await askFolder(io, 'Second mod folder');
        return runPocketConflicts({ directories: [a, b], json: false });
      }

      case 'manifest': {
        const directory = await askFolder(io, 'Which mod folder should I record');
        const save = await askYesNo(io, {
          explanation: '  Save the manifest into that folder as manifest.json?',
          question: '  Save it to a file',
          defaultValue: true,
        });
        return runPocketManifest({
          directory,
          ...(save ? { output: `${directory}/manifest.json` } : {}),
          format: 'json',
          json: false,
        });
      }

      case 'diff': {
        const before = await askFolder(io, 'The older version (folder or manifest.json)');
        const after = await askFolder(io, 'The newer version (folder or manifest.json)');
        return runPocketDiff({ before, after, showUnchanged: false, json: false });
      }

      case 'path': {
        const project = await askFolder(io, 'Which mod project');
        const file = await askText(io, {
          explanation: [
            '  Which file inside it? You can drag the file in, or type its path',
            '  relative to the project.',
          ].join('\n'),
          question: '  File',
        });
        return runPocketPath({
          project,
          file: stripQuotes(file),
          copy: true,
          json: false,
        });
      }

      default:
        return EXIT_CODES.USAGE;
    }
  } catch {
    write('');
    write('Cancelled. Nothing was changed.');
    return EXIT_CODES.OK;
  }
}

async function askFolder(io: PromptIO, question: string): Promise<string> {
  const answer = await askText(io, { question: `  ${question}` });
  return stripQuotes(answer);
}

/**
 * Removes the quoting a shell adds when a folder is dragged into a terminal.
 *
 * Dragging is the way most people will supply a path here, and macOS Terminal
 * inserts `'/Users/you/My Mod'` complete with quotes. Passing those through
 * would look for a folder whose name literally starts with an apostrophe.
 */
export function stripQuotes(input: string): string {
  const trimmed = input.trim();
  const quoted =
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'));
  const unquoted = quoted && trimmed.length >= 2 ? trimmed.slice(1, -1) : trimmed;
  // A dragged path escapes spaces on some shells; undo that too.
  return unquoted.replace(/\\ /g, ' ');
}
