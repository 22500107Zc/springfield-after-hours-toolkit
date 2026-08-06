import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Fixture helpers.
 *
 * Every fixture is built from scratch in a temporary directory. Nothing here
 * requires the game, the Mod Launcher, or any copyrighted file — the whole
 * point of these tools is that they operate on ordinary files, so ordinary
 * files are all the tests need.
 *
 * Two host capabilities genuinely vary and cannot be papered over:
 *
 * - **Case sensitivity.** macOS and Windows will not let `A.txt` and `a.txt`
 *   coexist, so a collision fixture cannot be *created* there. Tests that need
 *   one either use {@link caseSensitiveFs} to skip, or exercise the pure
 *   collision function with in-memory paths — which every host can do.
 * - **Symlink creation.** Windows refuses it without developer mode or
 *   elevation. {@link canSymlink} probes rather than assumes.
 *
 * Probing beats guessing from `process.platform`: a case-sensitive volume on a
 * Mac is entirely possible, and so is a Windows runner with symlinks enabled.
 */

const created: string[] = [];

/** Creates an empty temporary directory that is removed after the test file. */
export function tempDir(prefix = 'sah-pocket-'): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  created.push(directory);
  // Resolved because macOS makes /tmp a symlink to /private/tmp, and the tools
  // return real paths.
  return fs.realpathSync(directory);
}

export function cleanupTempDirs(): void {
  while (created.length > 0) {
    const directory = created.pop();
    if (directory) fs.rmSync(directory, { recursive: true, force: true });
  }
}

/**
 * Builds a directory tree from a flat map of POSIX-relative path to contents.
 *
 * A trailing `/` in a key makes an empty directory.
 */
export function makeTree(files: Record<string, string>, prefix = 'sah-pocket-'): string {
  const root = tempDir(prefix);
  writeInto(root, files);
  return root;
}

export function writeInto(root: string, files: Record<string, string>): void {
  for (const [relative, contents] of Object.entries(files)) {
    const absolute = path.join(root, ...relative.split('/'));
    if (relative.endsWith('/')) {
      fs.mkdirSync(absolute, { recursive: true });
      continue;
    }
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, contents);
  }
}

/** Absolute path of a POSIX-relative path inside a fixture. */
export function at(root: string, relative: string): string {
  return path.join(root, ...relative.split('/'));
}

let caseSensitiveCache: boolean | undefined;

/** True when the temp filesystem distinguishes `A` from `a`. */
export function caseSensitiveFs(): boolean {
  if (caseSensitiveCache !== undefined) return caseSensitiveCache;

  const probe = fs.mkdtempSync(path.join(os.tmpdir(), 'sah-case-probe-'));
  try {
    fs.writeFileSync(path.join(probe, 'Probe.txt'), 'a');
    caseSensitiveCache = !fs.existsSync(path.join(probe, 'probe.txt'));
  } catch {
    caseSensitiveCache = false;
  } finally {
    fs.rmSync(probe, { recursive: true, force: true });
  }
  return caseSensitiveCache;
}

let symlinkCache: boolean | undefined;

/** True when this host lets the test process create symbolic links. */
export function canSymlink(): boolean {
  if (symlinkCache !== undefined) return symlinkCache;

  const probe = fs.mkdtempSync(path.join(os.tmpdir(), 'sah-link-probe-'));
  try {
    fs.writeFileSync(path.join(probe, 'target'), 'a');
    fs.symlinkSync(path.join(probe, 'target'), path.join(probe, 'link'));
    symlinkCache = true;
  } catch {
    symlinkCache = false;
  } finally {
    fs.rmSync(probe, { recursive: true, force: true });
  }
  return symlinkCache;
}

/** Creates a symlink, returning false when the host refuses. */
export function trySymlink(target: string, linkPath: string, type?: 'dir' | 'file'): boolean {
  try {
    fs.mkdirSync(path.dirname(linkPath), { recursive: true });
    fs.symlinkSync(target, linkPath, type);
    return true;
  } catch {
    return false;
  }
}

/** Lists a directory tree as sorted POSIX-relative paths. Follows nothing. */
export function listTree(root: string): string[] {
  const out: string[] = [];
  const walk = (absolute: string, relative: string): void => {
    for (const dirent of fs.readdirSync(absolute, { withFileTypes: true })) {
      const childRelative = relative ? `${relative}/${dirent.name}` : dirent.name;
      const childAbsolute = path.join(absolute, dirent.name);
      if (dirent.isSymbolicLink()) out.push(`${childRelative} -> link`);
      else if (dirent.isDirectory()) walk(childAbsolute, childRelative);
      else out.push(childRelative);
    }
  };
  walk(root, '');
  return out.sort();
}
