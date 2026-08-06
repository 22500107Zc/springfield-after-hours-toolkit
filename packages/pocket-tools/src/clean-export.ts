import fs from 'node:fs';
import path from 'node:path';
import { isInside } from '@sah/core';
import { PocketToolError } from './errors.js';
import { classifyJunk, type JunkKind } from './junk.js';
import { comparePaths, readableReason, resolveRoot, type ScannedSymlink } from './scan.js';

/**
 * Pocket tool 2 — Mac Junk Cleaner.
 *
 * macOS leaves metadata in every folder it touches. Zip a mod on a Mac and it
 * ships with a `.DS_Store` beside every asset and an AppleDouble `._twin` for
 * every file — sometimes a whole `__MACOSX` tree.
 *
 * **The default operation copies, it does not delete.** `clean-export` writes a
 * clean duplicate to a new folder and leaves the original untouched, so the
 * worst possible outcome of a mistake is a folder you can throw away. Deleting
 * from the original is a separate, explicitly flagged, explicitly confirmed
 * operation.
 */

export interface JunkFinding {
  /** Path relative to the source folder, forward slashes. */
  path: string;
  kind: JunkKind;
  why: string;
  type: 'file' | 'directory';
  /** Bytes; summed recursively for a directory. */
  bytes: number;
}

export interface CleanPlan {
  source: string;
  /** Files that will be copied to the export. */
  keep: Array<{ path: string; bytes: number }>;
  junk: JunkFinding[];
  /** Symlinks found in the source, and what will happen to each. */
  symlinks: Array<ScannedSymlink & { action: 'recreated' | 'skipped'; reason: string }>;
  skipped: Array<{ path: string; reason: string }>;
  junkBytes: number;
  keptBytes: number;
}

/**
 * Builds the preview. Reads only; writes nothing, whatever the caller does next.
 */
export function planClean(source: string): CleanPlan {
  const root = resolveRoot(source);

  const keep: Array<{ path: string; bytes: number }> = [];
  const junk: JunkFinding[] = [];
  const symlinks: CleanPlan['symlinks'] = [];
  const skipped: Array<{ path: string; reason: string }> = [];

  const walk = (absolute: string, relative: string): void => {
    let dirents: fs.Dirent[];
    try {
      dirents = fs.readdirSync(absolute, { withFileTypes: true });
    } catch (error) {
      skipped.push({ path: relative || '.', reason: readableReason(error) });
      return;
    }

    for (const dirent of dirents.sort((a, b) => comparePaths(a.name, b.name))) {
      const childAbsolute = path.join(absolute, dirent.name);
      const childRelative = relative ? `${relative}/${dirent.name}` : dirent.name;

      if (dirent.isSymbolicLink()) {
        symlinks.push(planSymlink(root, childAbsolute, childRelative));
        continue;
      }

      const classification = classifyJunk(dirent.name, dirent.isDirectory());
      if (classification) {
        junk.push({
          path: childRelative,
          kind: classification.kind,
          why: classification.why,
          type: dirent.isDirectory() ? 'directory' : 'file',
          bytes: dirent.isDirectory() ? directorySize(childAbsolute) : sizeOf(childAbsolute),
        });
        continue;
      }

      if (dirent.isDirectory()) {
        walk(childAbsolute, childRelative);
        continue;
      }

      if (!dirent.isFile()) {
        skipped.push({ path: childRelative, reason: 'not a regular file' });
        continue;
      }

      keep.push({ path: childRelative, bytes: sizeOf(childAbsolute) });
    }
  };

  walk(root, '');

  keep.sort((a, b) => comparePaths(a.path, b.path));
  junk.sort((a, b) => comparePaths(a.path, b.path));
  symlinks.sort((a, b) => comparePaths(a.path, b.path));
  skipped.sort((a, b) => comparePaths(a.path, b.path));

  return {
    source: root,
    keep,
    junk,
    symlinks,
    skipped,
    junkBytes: junk.reduce((sum, entry) => sum + entry.bytes, 0),
    keptBytes: keep.reduce((sum, entry) => sum + entry.bytes, 0),
  };
}

/**
 * Decides what to do with a symlink found in the source.
 *
 * A link pointing inside the project still means something after the copy, so
 * it is recreated as a link. A link pointing anywhere else is dropped: copying
 * it would either export a file from outside the project or leave a broken link
 * in a mod someone is about to share.
 */
function planSymlink(
  root: string,
  absolute: string,
  relative: string,
): CleanPlan['symlinks'][number] {
  let target = '';
  try {
    target = fs.readlinkSync(absolute);
  } catch (error) {
    return {
      path: relative,
      target: `<unreadable>`,
      escapes: true,
      dangling: true,
      action: 'skipped',
      reason: `could not be read (${readableReason(error)})`,
    };
  }

  const resolved = path.resolve(path.dirname(absolute), target);
  let real = resolved;
  let dangling = false;
  try {
    real = fs.realpathSync(resolved);
  } catch {
    dangling = true;
  }

  const escapes = !isInside(root, real);
  if (escapes) {
    return {
      path: relative,
      target,
      escapes,
      dangling,
      action: 'skipped',
      reason: 'points outside the project, so it is not exported',
    };
  }
  if (dangling) {
    return {
      path: relative,
      target,
      escapes,
      dangling,
      action: 'skipped',
      reason: 'points at something that does not exist',
    };
  }
  return {
    path: relative,
    target,
    escapes,
    dangling,
    action: 'recreated',
    reason: 'points inside the project, so the link itself is recreated',
  };
}

export interface CleanExportOptions {
  source: string;
  destination: string;
  /** Write into a destination that already has files in it. */
  force?: boolean;
}

export interface CleanExportResult {
  plan: CleanPlan;
  destination: string;
  copied: string[];
  linked: string[];
  errors: string[];
}

/**
 * Copies everything except junk into a new folder. The source is opened
 * read-only and is never modified.
 */
export function cleanExport(options: CleanExportOptions): CleanExportResult {
  const plan = planClean(options.source);
  const destination = path.resolve(options.destination);

  assertUsableDestination(plan.source, destination, options.force ?? false);

  fs.mkdirSync(destination, { recursive: true });

  const copied: string[] = [];
  const linked: string[] = [];
  const errors: string[] = [];

  for (const file of plan.keep) {
    const from = path.join(plan.source, ...file.path.split('/'));
    const to = path.join(destination, ...file.path.split('/'));
    try {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      // COPYFILE_EXCL would fail on a re-run into the same folder; the
      // destination emptiness check above is what prevents clobbering.
      fs.copyFileSync(from, to);
      copied.push(file.path);
    } catch (error) {
      errors.push(`${file.path}: ${readableReason(error)}`);
    }
  }

  for (const link of plan.symlinks) {
    if (link.action !== 'recreated') continue;
    const to = path.join(destination, ...link.path.split('/'));
    try {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.symlinkSync(link.target, to);
      linked.push(link.path);
    } catch (error) {
      // Windows refuses symlink creation without privilege; that is a note, not
      // a failure of the export.
      errors.push(`${link.path}: link not recreated (${readableReason(error)})`);
    }
  }

  return { plan, destination, copied, linked, errors };
}

function assertUsableDestination(source: string, destination: string, force: boolean): void {
  if (destination === source) {
    throw new PocketToolError(
      'The export folder is the same as the project folder.',
      'Choose a new, empty folder for the clean copy.',
    );
  }
  if (isInside(source, destination)) {
    throw new PocketToolError(
      'The export folder is inside the project folder.',
      'Choose a folder beside the project, not within it, so the copy does not copy itself.',
    );
  }
  if (isInside(destination, source)) {
    throw new PocketToolError(
      'The project folder is inside the export folder.',
      'Choose an export folder that does not contain the project.',
    );
  }

  if (!fs.existsSync(destination)) return;

  if (!fs.statSync(destination).isDirectory()) {
    throw new PocketToolError(
      `A file already exists at the export path: ${destination}`,
      'Choose a folder path that is free.',
    );
  }
  if (fs.readdirSync(destination).length > 0 && !force) {
    throw new PocketToolError(
      `The export folder is not empty: ${destination}`,
      'Choose an empty folder, or pass --force to write into this one anyway.',
    );
  }
}

export interface CleanInPlaceOptions {
  source: string;
  /** Must be true. Present so a caller cannot delete by forgetting an argument. */
  confirm: boolean;
}

export interface CleanInPlaceResult {
  plan: CleanPlan;
  removed: string[];
  errors: string[];
}

/**
 * Deletes junk from the original folder.
 *
 * Reachable only through `sah pocket clean-export --in-place --yes`, and every
 * removal is re-verified immediately before it happens: the name must still be
 * on the junk list and the path must still be inside the project. A symlink
 * swapped in between the preview and the delete therefore cannot redirect it.
 */
export function cleanInPlace(options: CleanInPlaceOptions): CleanInPlaceResult {
  if (!options.confirm) {
    throw new PocketToolError(
      'Refusing to delete anything without explicit confirmation.',
      'Re-run with --in-place --yes if you really want to remove junk from the original folder.',
    );
  }

  const plan = planClean(options.source);
  const removed: string[] = [];
  const errors: string[] = [];

  for (const entry of plan.junk) {
    const absolute = path.join(plan.source, ...entry.path.split('/'));

    if (!isInside(plan.source, absolute) || absolute === plan.source) {
      errors.push(`${entry.path}: refused, not inside the project folder`);
      continue;
    }

    let stats: fs.Stats;
    try {
      stats = fs.lstatSync(absolute);
    } catch (error) {
      errors.push(`${entry.path}: ${readableReason(error)}`);
      continue;
    }

    if (stats.isSymbolicLink()) {
      errors.push(`${entry.path}: refused, this is now a symbolic link`);
      continue;
    }
    if (!classifyJunk(path.basename(absolute), stats.isDirectory())) {
      errors.push(`${entry.path}: refused, name is not on the junk list`);
      continue;
    }

    try {
      fs.rmSync(absolute, { recursive: stats.isDirectory(), force: false });
      removed.push(entry.path);
    } catch (error) {
      errors.push(`${entry.path}: ${readableReason(error)}`);
    }
  }

  return { plan, removed, errors };
}

function sizeOf(file: string): number {
  try {
    return fs.lstatSync(file).size;
  } catch {
    return 0;
  }
}

function directorySize(directory: string): number {
  let total = 0;
  const walk = (current: string): void => {
    let dirents: fs.Dirent[];
    try {
      dirents = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const dirent of dirents) {
      if (dirent.isSymbolicLink()) continue;
      const absolute = path.join(current, dirent.name);
      if (dirent.isDirectory()) walk(absolute);
      else total += sizeOf(absolute);
    }
  };
  walk(directory);
  return total;
}
