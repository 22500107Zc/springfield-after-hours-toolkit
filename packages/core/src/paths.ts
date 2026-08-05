import path from 'node:path';

/**
 * Path safety.
 *
 * Two separate concerns live here and they must not be confused:
 *
 * 1. **Host filesystem safety** — nothing the toolkit writes may escape the
 *    directory it was told to write into. This guards the CLI and, more
 *    importantly, the MCP server, where the caller is a language model.
 * 2. **Game path shape** — paths *inside* a mod are Windows-style, backslashed,
 *    and case-sensitive in ways that bite on Linux and macOS. The toolkit
 *    checks their shape but never touches the game installation.
 */

/**
 * Characters Windows forbids in a path segment.
 *
 * The control-character range is the point of the check, not an oversight:
 * Windows rejects 0x00-0x1F in filenames, and a path carrying one is exactly
 * the kind of input that must not reach the filesystem.
 */
// eslint-disable-next-line no-control-regex
const WINDOWS_FORBIDDEN = /[<>:"|?*\u0000-\u001f]/;

/** Names Windows reserves regardless of extension. */
const WINDOWS_RESERVED = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;

export interface PathSafetyResult {
  safe: boolean;
  /** Absolute, normalised path. Only meaningful when `safe` is true. */
  resolved: string;
  reason?: string;
}

/**
 * Resolves `candidate` against `root` and confirms the result stays inside
 * `root`.
 *
 * Rejects absolute paths, `..` traversal, and — on platforms where they are
 * meaningful — paths that would escape via a drive letter or UNC prefix.
 */
export function resolveWithin(root: string, candidate: string): PathSafetyResult {
  const absoluteRoot = path.resolve(root);

  if (candidate.length === 0) {
    return { safe: false, resolved: '', reason: 'path is empty' };
  }
  if (candidate.includes('\u0000')) {
    return { safe: false, resolved: '', reason: 'path contains a null byte' };
  }
  // Reject anything that is absolute in *either* path flavour, so a POSIX host
  // still rejects `C:\Windows` and `\\server\share`.
  if (
    path.isAbsolute(candidate) ||
    path.win32.isAbsolute(candidate) ||
    /^[A-Za-z]:/.test(candidate)
  ) {
    return { safe: false, resolved: '', reason: 'path must be relative to the campaign root' };
  }

  const normalised = path.resolve(absoluteRoot, candidate);
  const relative = path.relative(absoluteRoot, normalised);

  if (relative === '') {
    return { safe: false, resolved: '', reason: 'path resolves to the root itself' };
  }
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return {
      safe: false,
      resolved: '',
      reason: 'path escapes the campaign root',
    };
  }

  return { safe: true, resolved: normalised };
}

/** True when `child` is inside `parent` (or equal to it). */
export function isInside(parent: string, child: string): boolean {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

export interface GamePathIssue {
  kind:
    'forbidden-character' | 'reserved-name' | 'trailing-space-or-dot' | 'absolute' | 'traversal';
  segment?: string;
  message: string;
}

/**
 * Checks the shape of a path that will end up inside a mod (a `CustomFiles.ini`
 * key, a `PathHandlers` target, a resource location).
 *
 * Accepts either slash flavour on input, because authors on macOS and Linux
 * naturally type forward slashes.
 */
export function inspectGamePath(input: string): GamePathIssue[] {
  const issues: GamePathIssue[] = [];
  const unified = input.replace(/\\/g, '/');

  if (unified.startsWith('/') || /^[A-Za-z]:/.test(input)) {
    issues.push({ kind: 'absolute', message: `"${input}" must be relative to the mod root` });
  }

  for (const segment of unified.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      issues.push({
        kind: 'traversal',
        segment,
        message: `"${input}" contains ".." which would escape the mod folder`,
      });
      continue;
    }
    if (WINDOWS_FORBIDDEN.test(segment)) {
      issues.push({
        kind: 'forbidden-character',
        segment,
        message: `path segment "${segment}" contains a character Windows does not allow`,
      });
    }
    if (WINDOWS_RESERVED.test(segment)) {
      issues.push({
        kind: 'reserved-name',
        segment,
        message: `path segment "${segment}" is a reserved Windows device name`,
      });
    }
    if (/[ .]$/.test(segment)) {
      issues.push({
        kind: 'trailing-space-or-dot',
        segment,
        message: `path segment "${segment}" ends with a space or dot, which Windows silently strips`,
      });
    }
  }

  return issues;
}

/** Converts an author-friendly path to the backslashed form game scripts use. */
export function toGamePath(input: string): string {
  return input.replace(/\//g, '\\');
}

/** Converts a game path to forward slashes, for display and comparison. */
export function toPosixPath(input: string): string {
  return input.replace(/\\/g, '/');
}

/**
 * Escapes a path for embedding in a Lua string literal.
 *
 * Game.lua's documentation is explicit that backslashes must be doubled inside
 * Lua strings, which is the single easiest thing to get wrong by hand.
 */
export function escapeLuaString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/**
 * Detects output paths that differ only by case.
 *
 * Windows would treat these as one file and silently overwrite; Linux would
 * produce two. Either way the author did not mean it.
 */
export function findCaseCollisions(paths: readonly string[]): Array<{
  lowercased: string;
  members: string[];
}> {
  const groups = new Map<string, string[]>();
  for (const p of paths) {
    const key = toPosixPath(p).toLowerCase();
    const existing = groups.get(key);
    if (existing) existing.push(p);
    else groups.set(key, [p]);
  }
  return [...groups.entries()]
    .filter(([, members]) => new Set(members).size > 1)
    .map(([lowercased, members]) => ({ lowercased, members: [...new Set(members)].sort() }))
    .sort((a, b) => a.lowercased.localeCompare(b.lowercased));
}
