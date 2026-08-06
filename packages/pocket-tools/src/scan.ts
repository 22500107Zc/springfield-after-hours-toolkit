import fs from 'node:fs';
import path from 'node:path';
import { isInside } from '@sah/core';
import { missing, notADirectory, PocketToolError } from './errors.js';

/**
 * The shared, safe directory walk that every pocket tool is built on.
 *
 * Each tool is handed a folder by someone who may have typed it, pasted it, or
 * dragged it in, and that folder may contain anything. Three rules hold
 * everywhere, and they are enforced here rather than repeated in six places:
 *
 * 1. **Symlinks are never followed.** Not for walking, not for reading, not for
 *    copying, not for deleting. A link is recorded as a link.
 * 2. **Nothing outside the chosen folder is ever read.** Because links are not
 *    followed, the walk physically cannot leave. Links that *point* outside are
 *    reported so the author knows they are there.
 * 3. **Results are ordered by code unit, not by locale.** `localeCompare`
 *    depends on the ICU data the host Node was built with, so two machines can
 *    disagree. Manifests have to be byte-identical everywhere, so the ordering
 *    cannot depend on the machine.
 */

export interface ScannedFile {
  /** Path relative to the scan root, always forward slashes. */
  path: string;
  bytes: number;
}

export interface ScannedSymlink {
  path: string;
  /** The link's target exactly as stored, unresolved. */
  target: string;
  /** True when the target resolves outside the scanned folder. */
  escapes: boolean;
  /** True when the target does not exist. */
  dangling: boolean;
}

export interface UnreadableEntry {
  path: string;
  reason: string;
}

export interface ScanResult {
  /** The real, absolute root. Symlinks in the root itself are resolved once. */
  root: string;
  files: ScannedFile[];
  /** Directories, relative to the root, deepest last. */
  directories: string[];
  symlinks: ScannedSymlink[];
  unreadable: UnreadableEntry[];
}

/**
 * Deterministic path ordering.
 *
 * Deliberately not `localeCompare`: manifests must sort identically on every
 * machine, and locale collation does not guarantee that.
 */
export function comparePaths(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * Resolves a user-supplied folder into an absolute real path, with clear
 * errors when it is not usable.
 *
 * The `realpath` matters: on macOS `/tmp` is itself a symlink to `/private/tmp`,
 * so a containment check against an unresolved root would reject paths that are
 * genuinely inside it.
 */
export function resolveRoot(target: string): string {
  const absolute = path.resolve(target);
  if (!fs.existsSync(absolute)) throw missing(absolute);

  const stats = fs.statSync(absolute);
  if (!stats.isDirectory()) throw notADirectory(absolute);

  return fs.realpathSync(absolute);
}

export interface ScanOptions {
  root: string;
  /**
   * Directory names skipped entirely, matched case-insensitively on the whole
   * segment. `.git` is excluded by default: a mod's history is not part of the
   * mod, and hashing it makes every manifest enormous and meaningless.
   */
  skipDirectories?: readonly string[];
}

export const DEFAULT_SKIP_DIRECTORIES = ['.git'] as const;

export function scanDirectory(options: ScanOptions): ScanResult {
  const root = resolveRoot(options.root);
  const skip = new Set(
    (options.skipDirectories ?? DEFAULT_SKIP_DIRECTORIES).map((name) => name.toLowerCase()),
  );

  const files: ScannedFile[] = [];
  const directories: string[] = [];
  const symlinks: ScannedSymlink[] = [];
  const unreadable: UnreadableEntry[] = [];

  const walk = (absolute: string, relative: string): void => {
    let dirents: fs.Dirent[];
    try {
      dirents = fs.readdirSync(absolute, { withFileTypes: true });
    } catch (error) {
      unreadable.push({ path: relative || '.', reason: readableReason(error) });
      return;
    }

    for (const dirent of dirents.sort((a, b) => comparePaths(a.name, b.name))) {
      const childAbsolute = path.join(absolute, dirent.name);
      const childRelative = relative ? `${relative}/${dirent.name}` : dirent.name;

      // Checked before anything else: `isDirectory()` is false for a symlink to
      // a directory, but only because we asked for the link's own type. Reading
      // it any other way would follow it.
      if (dirent.isSymbolicLink()) {
        symlinks.push(describeSymlink(root, childAbsolute, childRelative));
        continue;
      }

      if (dirent.isDirectory()) {
        if (skip.has(dirent.name.toLowerCase())) continue;
        directories.push(childRelative);
        walk(childAbsolute, childRelative);
        continue;
      }

      if (!dirent.isFile()) {
        // Sockets, FIFOs, devices. Nothing here should read them.
        unreadable.push({ path: childRelative, reason: 'not a regular file' });
        continue;
      }

      try {
        files.push({ path: childRelative, bytes: fs.statSync(childAbsolute).size });
      } catch (error) {
        unreadable.push({ path: childRelative, reason: readableReason(error) });
      }
    }
  };

  walk(root, '');

  files.sort((a, b) => comparePaths(a.path, b.path));
  directories.sort(comparePaths);
  symlinks.sort((a, b) => comparePaths(a.path, b.path));
  unreadable.sort((a, b) => comparePaths(a.path, b.path));

  return { root, files, directories, symlinks, unreadable };
}

function describeSymlink(root: string, absolute: string, relative: string): ScannedSymlink {
  let target = '';
  try {
    target = fs.readlinkSync(absolute);
  } catch (error) {
    return {
      path: relative,
      target: `<unreadable: ${readableReason(error)}>`,
      escapes: true,
      dangling: true,
    };
  }

  // Resolve against the link's own directory, the way the OS would.
  const resolved = path.resolve(path.dirname(absolute), target);

  let real = resolved;
  let dangling = false;
  try {
    real = fs.realpathSync(resolved);
  } catch {
    // A dangling link still has a location; judge escape by where it points.
    dangling = true;
  }

  return { path: relative, target, escapes: !isInside(root, real), dangling };
}

/**
 * Confirms a path chosen by the user really is inside the project.
 *
 * Used by the tools that accept a file as well as a folder. Both sides are
 * resolved through `realpath` where possible, so neither a `..` segment nor a
 * symlink can be used to name something outside.
 */
export function requireInsideProject(root: string, candidate: string): string {
  const realRoot = resolveRoot(root);
  const absolute = path.resolve(realRoot, candidate);

  // Containment is checked on the lexically resolved path FIRST, before the
  // path is known to exist. `../../../../etc/passwd` is out of scope whether or
  // not it happens to be there, and saying so is more useful — and less of a
  // probe of the surrounding filesystem — than "no such file".
  if (!isInside(realRoot, absolute)) throw outsideProject(realRoot, absolute);

  if (!fs.existsSync(absolute)) throw missing(absolute);

  // Re-checked after resolving links: the path is inside the project, but a
  // symlink may still point out of it.
  const real = fs.realpathSync(absolute);
  if (!isInside(realRoot, real)) throw outsideProject(realRoot, real);

  return real;
}

function outsideProject(root: string, target: string): PocketToolError {
  return new PocketToolError(
    'That path is outside the project folder you selected.',
    `Project: ${root}\nPath:    ${target}\nPick a file inside the project, or select a different project folder.`,
  );
}

/** Turns a filesystem error into something a non-programmer can act on. */
export function readableReason(error: unknown): string {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  switch (code) {
    case 'EACCES':
    case 'EPERM':
      return 'permission denied';
    case 'ENOENT':
      return 'no longer exists';
    case 'ELOOP':
      return 'too many symbolic links';
    case 'ENAMETOOLONG':
      return 'name too long';
    default:
      return (error as Error | undefined)?.message ?? 'unknown error';
  }
}

/** Converts a native path to the forward-slash form used in all output. */
export function toRelativePosix(root: string, absolute: string): string {
  return path.relative(root, absolute).split(path.sep).join('/');
}
