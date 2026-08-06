import fs from 'node:fs';
import path from 'node:path';
import { comparePaths, scanDirectory, type ScanResult } from './scan.js';
import {
  commentMarkersFor,
  extractReferences,
  isScannableFile,
  normaliseReference,
} from './references.js';

/**
 * Pocket tool 1 — Case Checker.
 *
 * macOS and Windows are usually case-insensitive; Linux and the inside of a zip
 * are not. So two problems live and breed on a Mac and only surface for someone
 * else:
 *
 * - **Colliding paths.** `Scripts/main.lua` and `scripts/main.lua` are one file
 *   on a Mac and two in an archive.
 * - **Mis-cased references.** A file says `Scripts/Main.lua`, the file on disk
 *   is `scripts/main.lua`. Works locally, fails elsewhere.
 *
 * The second check reports a reference only when the exact path does **not**
 * exist but a case-insensitive match **does**. That is the whole false-positive
 * defence: a word that matches no real file is never mentioned, so ordinary
 * prose produces no output at all.
 *
 * This tool reads and reports. It changes nothing.
 */

export interface CaseCollision {
  /** The shared lower-cased path. */
  lowercased: string;
  /** Every real path that folds to it. */
  paths: string[];
  type: 'file' | 'directory';
}

export interface MisCasedReference {
  /** The text file the reference was found in. */
  file: string;
  line: number;
  column: number;
  /** The reference exactly as written. */
  referenced: string;
  /** The real path on disk. */
  actual: string;
  /** The corrected reference, in the separator style the original used. */
  suggestion: string;
}

export interface CaseCheckResult {
  root: string;
  filesScanned: number;
  textFilesRead: number;
  collisions: CaseCollision[];
  references: MisCasedReference[];
  skipped: Array<{ path: string; reason: string }>;
  ok: boolean;
}

/** Text files larger than this are not read; a mod has no 8 MB `.ini`. */
const MAX_TEXT_BYTES = 8 * 1024 * 1024;

export interface CaseCheckOptions {
  root: string;
  /** Read text files looking for mis-cased references. Defaults to true. */
  checkReferences?: boolean;
}

export function checkCase(options: CaseCheckOptions): CaseCheckResult {
  const scan = scanDirectory({ root: options.root });
  const checkReferences = options.checkReferences ?? true;

  const collisions = [
    ...findPathCollisions(
      scan.files.map((file) => file.path),
      'file',
    ),
    ...findPathCollisions(scan.directories, 'directory'),
  ].sort((a, b) => comparePaths(a.lowercased, b.lowercased));

  const skipped: Array<{ path: string; reason: string }> = scan.unreadable.map((entry) => ({
    path: entry.path,
    reason: entry.reason,
  }));
  for (const link of scan.symlinks) {
    skipped.push({
      path: link.path,
      reason: link.escapes
        ? 'symbolic link pointing outside the project — not followed'
        : 'symbolic link — not followed',
    });
  }

  const references: MisCasedReference[] = [];
  let textFilesRead = 0;

  if (checkReferences) {
    // One index of every real path, keyed by its lower-cased form. Built once;
    // every lookup is then a map hit rather than a filesystem probe, which also
    // means the answer does not depend on whether the host filesystem happens
    // to be case-insensitive.
    const index = buildIndex(scan);

    for (const file of scan.files) {
      if (!isScannableFile(file.path)) continue;
      if (file.bytes > MAX_TEXT_BYTES) {
        skipped.push({ path: file.path, reason: 'larger than 8 MB — not read as text' });
        continue;
      }

      let text: string;
      try {
        text = fs.readFileSync(path.join(scan.root, ...file.path.split('/')), 'utf8');
      } catch {
        skipped.push({ path: file.path, reason: 'could not be read as UTF-8 text' });
        continue;
      }
      // A NUL byte means this is not really text, whatever the extension says.
      if (text.includes('\u0000')) {
        skipped.push({ path: file.path, reason: 'contains binary data — not read as text' });
        continue;
      }
      textFilesRead += 1;

      const markers = commentMarkersFor(file.path);
      for (const candidate of extractReferences(text, { commentMarkers: markers })) {
        const normalised = normaliseReference(candidate.raw);
        if (normalised === undefined) continue;

        // Exact match: nothing to report.
        if (index.exact.has(normalised)) continue;

        const actual = index.folded.get(normalised.toLowerCase());
        // No real file by any casing: not a reference, or a genuinely missing
        // file. Either way it is not a *case* problem, and this tool does not
        // guess about the other kind.
        if (actual === undefined) continue;
        // Ambiguous: the project itself has a collision here, already reported.
        if (actual === AMBIGUOUS) continue;

        references.push({
          file: file.path,
          line: candidate.line,
          column: candidate.column,
          referenced: candidate.raw,
          actual,
          suggestion: matchSeparatorStyle(candidate.raw, actual),
        });
      }
    }
  }

  references.sort((a, b) => comparePaths(a.file, b.file) || a.line - b.line || a.column - b.column);
  skipped.sort((a, b) => comparePaths(a.path, b.path));

  return {
    root: scan.root,
    filesScanned: scan.files.length,
    textFilesRead,
    collisions,
    references,
    skipped,
    ok: collisions.length === 0 && references.length === 0,
  };
}

const AMBIGUOUS = Symbol('ambiguous');

interface PathIndex {
  exact: Set<string>;
  folded: Map<string, string | typeof AMBIGUOUS>;
}

function buildIndex(scan: ScanResult): PathIndex {
  const exact = new Set<string>();
  const folded = new Map<string, string | typeof AMBIGUOUS>();

  const add = (relative: string): void => {
    exact.add(relative);
    const key = relative.toLowerCase();
    const existing = folded.get(key);
    if (existing === undefined) folded.set(key, relative);
    else if (existing !== relative) folded.set(key, AMBIGUOUS);
  };

  for (const file of scan.files) add(file.path);
  for (const directory of scan.directories) add(directory);

  return { exact, folded };
}

/**
 * Groups paths that fold to the same lower-cased string.
 *
 * Exported because it is the one piece of this tool that cannot be tested
 * through the filesystem everywhere: macOS and Windows will not let two
 * colliding names exist at once, so on those hosts the interesting input can
 * only be constructed in memory.
 */
export function findPathCollisions(
  paths: readonly string[],
  type: 'file' | 'directory' = 'file',
): CaseCollision[] {
  const groups = new Map<string, string[]>();
  for (const value of paths) {
    const key = value.toLowerCase();
    const existing = groups.get(key);
    if (existing) existing.push(value);
    else groups.set(key, [value]);
  }

  return [...groups.entries()]
    .filter(([, members]) => new Set(members).size > 1)
    .map(([lowercased, members]) => ({
      lowercased,
      paths: [...new Set(members)].sort(comparePaths),
      type,
    }));
}

/**
 * Rewrites the corrected path using whichever separator the author was using,
 * so a suggestion can be pasted straight back into a `.mfk` full of backslashes.
 */
export function matchSeparatorStyle(original: string, corrected: string): string {
  const usesBackslash = original.includes('\\') && !original.includes('/');
  const prefix = /^\.?\//.exec(original)?.[0] ?? '';
  const body = usesBackslash ? corrected.replace(/\//g, '\\') : corrected;
  return usesBackslash ? body : `${prefix}${body}`;
}
