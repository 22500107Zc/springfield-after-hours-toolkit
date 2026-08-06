/**
 * Finding path references inside plain-text mod files.
 *
 * The hard part of this tool is not finding references — it is *not* finding
 * things that are not references. A mod's `.txt` files contain English prose,
 * and English prose contains words. Reporting every word as a possible filename
 * would make the tool useless within one run.
 *
 * So candidacy is narrow, and it is only half the test:
 *
 * 1. A candidate must **look like a path**: either it contains a separator, or
 *    it ends in one of the extensions a mod actually uses.
 * 2. It is only ever *reported* when the referenced path does not exist as
 *    written but **does** exist under a different case (see `case-check.ts`).
 *
 * Rule 2 is what makes rule 1 safe to be generous with. A false candidate that
 * matches no real file is silently discarded, so the cost of a loose pattern is
 * wasted work, never a wrong claim.
 */

/** Extensions that make a bare token a plausible path reference. */
export const REFERENCE_EXTENSIONS = [
  '.bmp',
  '.con',
  '.ini',
  '.json',
  '.lua',
  '.mfk',
  '.p3d',
  '.png',
  '.rcf',
  '.rsd',
  '.txt',
  '.wav',
  '.yaml',
  '.yml',
] as const;

/** File types this tool will open and read as text. */
export const SCANNED_EXTENSIONS = [
  '.con',
  '.ini',
  '.json',
  '.lua',
  '.mfk',
  '.txt',
  '.yaml',
  '.yml',
] as const;

export function isScannableFile(relativePath: string): boolean {
  const lower = relativePath.toLowerCase();
  return SCANNED_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

export interface ReferenceCandidate {
  /** The reference exactly as it appears in the file. */
  raw: string;
  /** 1-based line number. */
  line: number;
  /** 1-based column of the first character. */
  column: number;
}

/**
 * Matches a run of characters that could be a path.
 *
 * Excluded: whitespace, quotes, and the characters Windows forbids in a
 * filename anyway (`<>:"|?*`). Comma, semicolon and equals are excluded too,
 * because they are separators in every format scanned here.
 */
const PATH_LIKE = /[^\s"'`<>:|?*,;=()[\]{}]+/g;

const EXTENSION_TEST = new RegExp(
  `(${REFERENCE_EXTENSIONS.map((extension) => extension.replace('.', '\\.')).join('|')})$`,
  'i',
);

export interface ExtractOptions {
  /** Lines starting with these markers are ignored entirely. */
  commentMarkers?: readonly string[];
}

/** Comment markers by file extension, so a commented-out path is not reported. */
export function commentMarkersFor(relativePath: string): readonly string[] {
  const lower = relativePath.toLowerCase();
  if (lower.endsWith('.lua')) return ['--'];
  if (lower.endsWith('.ini')) return [';', '#'];
  if (lower.endsWith('.mfk') || lower.endsWith('.con')) return ['//', '#'];
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return ['#'];
  return [];
}

export function extractReferences(
  text: string,
  options: ExtractOptions = {},
): ReferenceCandidate[] {
  const markers = options.commentMarkers ?? [];
  const candidates: ReferenceCandidate[] = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const trimmed = line.trimStart();
    if (markers.some((marker) => trimmed.startsWith(marker))) continue;

    PATH_LIKE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = PATH_LIKE.exec(line)) !== null) {
      const raw = trimStrayPunctuation(match[0]);
      if (raw.length === 0) continue;
      if (!looksLikePath(raw)) continue;

      candidates.push({ raw, line: index + 1, column: match.index + 1 });
    }
  }

  return candidates;
}

/**
 * A token is path-like when it carries a separator or a known extension.
 *
 * A bare word is never a candidate, no matter what it is: `Springfield` in a
 * sentence must not become a claim about a file.
 */
export function looksLikePath(token: string): boolean {
  if (token.length < 3 || token.length > 512) return false;
  // A URL is not a file in the mod.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(token)) return false;

  const hasSeparator = token.includes('/') || token.includes('\\');
  if (hasSeparator) return true;

  return EXTENSION_TEST.test(token);
}

/** Strips punctuation a sentence leaves stuck to a filename. */
function trimStrayPunctuation(token: string): string {
  return token.replace(/^[.\-–—]+/, '').replace(/[.!?,:;]+$/, '');
}

/**
 * Normalises a reference into a project-relative lookup key.
 *
 * Mod files are written with Windows separators and sometimes a leading slash.
 * Neither changes which file is meant.
 */
export function normaliseReference(raw: string): string | undefined {
  let value = raw.replace(/\\/g, '/').trim();
  value = value.replace(/^\.\//, '');
  value = value.replace(/^\/+/, '');
  // A trailing slash names the same directory, so drop it before lookup.
  value = value.replace(/\/+$/, '');

  if (value.length === 0) return undefined;
  // A reference that climbs out of the project cannot be checked against it.
  if (value.split('/').includes('..')) return undefined;
  // A drive letter is an absolute local path, not a mod-relative reference.
  if (/^[A-Za-z]:/.test(value)) return undefined;

  return value;
}
