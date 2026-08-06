import path from 'node:path';
import { requireInsideProject, resolveRoot, toRelativePosix } from './scan.js';
import { PocketToolError } from './errors.js';

/**
 * Pocket tool 6 — Windows Path Copier.
 *
 * Mod files refer to their own contents with Windows separators, and getting
 * one wrong produces a mod that loads and quietly does nothing. This takes a
 * file you can point at and gives back the forms you actually have to type:
 *
 * | Form      | Example                                 | Used in                  |
 * | --------- | --------------------------------------- | ------------------------ |
 * | `windows` | `Resources\scripts\m0i.lua`             | game and Launcher paths  |
 * | `posix`   | `Resources/scripts/m0i.lua`             | anything cross-platform  |
 * | `ini`     | `Resources\\scripts\\m0i.lua`           | a CustomFiles.ini key    |
 * | `lua`     | `"Resources\\scripts\\m0i.lua"`         | a Lua string literal     |
 *
 * **Output is always project-relative.** An absolute path is never returned or
 * copied: `/Users/yourname/...` in a path pasted into a public forum tells
 * strangers your name, and it will not work on anyone else's machine either.
 *
 * Anything outside the selected project is refused rather than converted.
 */

export const PATH_FORMS = ['windows', 'posix', 'ini', 'lua'] as const;
export type PathFormName = (typeof PATH_FORMS)[number];

export interface ProjectPathResult {
  /** The project folder's own name. Never its absolute path. */
  project: string;
  /** Backslash form, relative to the project. */
  windows: string;
  /** Forward-slash form, relative to the project. */
  posix: string;
  /** Backslashes doubled, for an INI key. */
  ini: string;
  /** A complete, quoted Lua string literal. */
  lua: string;
  /** Notes about characters that may need care elsewhere. */
  notes: string[];
}

export function isPathFormName(value: string): value is PathFormName {
  return (PATH_FORMS as readonly string[]).includes(value);
}

export interface ProjectPathOptions {
  /** The mod project folder. Everything is expressed relative to this. */
  project: string;
  /** A file or folder inside it. May be absolute or relative to the project. */
  target: string;
}

export function projectPath(options: ProjectPathOptions): ProjectPathResult {
  const root = resolveRoot(options.project);
  // Throws with a clear message when the target is outside the project, and
  // resolves symlinks first so a link cannot be used to smuggle one in.
  const real = requireInsideProject(root, options.target);

  if (real === root) {
    throw new PocketToolError(
      'That is the project folder itself, not a file inside it.',
      'Pick a file or a subfolder within the project.',
    );
  }

  const posix = toRelativePosix(root, real);
  const windows = posix.replace(/\//g, '\\');

  return {
    project: path.basename(root),
    windows,
    posix,
    ini: windows.replace(/\\/g, '\\\\'),
    lua: `"${escapeLuaLiteral(windows)}"`,
    notes: describe(posix),
  };
}

/**
 * Escapes a path for a Lua string literal.
 *
 * Backslash doubling is the one people get wrong; the rest are here so a path
 * containing a quote or a control character cannot terminate the literal early.
 */
function escapeLuaLiteral(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/**
 * Flags characters that survive this conversion but tend to cause trouble in
 * whatever the path is pasted into. These are notes, not errors — the file
 * exists, so the name is evidently legal where it lives.
 */
function describe(posix: string): string[] {
  const notes: string[] = [];

  if (/\s/.test(posix)) {
    notes.push('contains spaces — quote it when pasting into a terminal');
  }
  if (/[^\u0020-\u007e]/.test(posix)) {
    notes.push('contains non-ASCII characters — keep the file UTF-8 encoded when you paste it');
  }
  if (posix.includes("'")) {
    notes.push('contains an apostrophe — use double quotes around it in a shell');
  }
  if (/[ .]\//.test(posix) || /[ .]$/.test(posix)) {
    notes.push('a path segment ends with a space or a dot, which Windows silently strips');
  }

  return notes;
}
