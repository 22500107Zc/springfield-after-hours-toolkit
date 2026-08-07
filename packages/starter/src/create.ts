import fs from 'node:fs';
import path from 'node:path';
import { isInside } from '@sah/core';
import { planStarterProject, STARTER_DIRECTORIES, type StarterOptions } from './plan.js';

/**
 * Writing the starter project.
 *
 * Separated from planning so the wizard can show a preview built from exactly
 * the bytes it is about to write, rather than a description of them.
 */

export class StarterError extends Error {
  readonly hint: string | undefined;
  /** True when nothing was written before the failure. */
  readonly nothingChanged: boolean;

  constructor(message: string, hint?: string, nothingChanged = true) {
    super(message);
    this.name = 'StarterError';
    this.hint = hint;
    this.nothingChanged = nothingChanged;
  }
}

export interface CreateOptions extends StarterOptions {
  /** Absolute or relative path of the folder to create. */
  destination: string;
}

export interface CreateResult {
  /** Absolute path of the created project. */
  root: string;
  /** POSIX-relative paths written, sorted. */
  written: string[];
}

/**
 * Creates the project folder.
 *
 * **Never overwrites.** The destination must not exist, or must be an entirely
 * empty directory. There is no `--force`: a beginner who mistypes a path should
 * lose nothing, and someone who wants to replace a project can delete it
 * themselves, deliberately.
 */
export function createStarterProject(options: CreateOptions): CreateResult {
  const root = path.resolve(options.destination);

  assertUsableDestination(root);

  const files = planStarterProject(options);

  fs.mkdirSync(root, { recursive: true });
  for (const directory of STARTER_DIRECTORIES) {
    fs.mkdirSync(path.join(root, ...directory.split('/')), { recursive: true });
  }

  const written: string[] = [];
  for (const file of files) {
    const absolute = path.join(root, ...file.path.split('/'));

    // Belt and braces: every path comes from planStarterProject, which uses
    // fixed literals, but a write that escapes the project folder is the one
    // mistake worth being paranoid about.
    if (!isInside(root, absolute)) {
      throw new StarterError(
        `Refusing to write outside the project folder: ${file.path}`,
        undefined,
        false,
      );
    }

    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, file.contents, 'utf8');
    written.push(file.path);
  }

  return { root, written: written.sort() };
}

function assertUsableDestination(root: string): void {
  if (fs.existsSync(root)) {
    const stats = fs.statSync(root);

    if (!stats.isDirectory()) {
      throw new StarterError(
        `There is already a file at that location: ${root}`,
        'Choose a different name, or move that file out of the way first.',
      );
    }

    const entries = fs.readdirSync(root);
    if (entries.length > 0) {
      throw new StarterError(
        `That folder already exists and is not empty: ${root}`,
        [
          'Nothing has been changed.',
          '',
          'Pick a different name, or delete that folder yourself if you are sure',
          'you do not need what is in it.',
        ].join('\n'),
      );
    }
  }

  // Creating the project must not require creating a whole tree of missing
  // parents — that usually means a typo in the path.
  const parent = path.dirname(root);
  if (!fs.existsSync(parent)) {
    throw new StarterError(
      `The folder that would contain your project does not exist: ${parent}`,
      'Check the path for a typo, or create that folder first.',
    );
  }
  if (!fs.statSync(parent).isDirectory()) {
    throw new StarterError(
      `That path is inside a file, not a folder: ${parent}`,
      'Choose a location inside a real folder.',
    );
  }
}
