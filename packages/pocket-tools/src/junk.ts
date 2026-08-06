/**
 * What counts as junk.
 *
 * This list is deliberately closed and deliberately short. Every entry is a
 * file some tool creates automatically and no author writes by hand, so
 * removing it cannot lose work.
 *
 * Two categories are pointedly absent:
 *
 * - **Hidden files in general.** `.gitignore`, `.editorconfig` and `.luarc.json`
 *   are all hidden and all source. Being hidden is not evidence of being junk.
 * - **Anything a `.gitignore` excludes.** Ignored is not the same as
 *   disposable — build output an author still needs is routinely ignored.
 *
 * If a name is not on this list, these tools leave it alone.
 */

export type JunkKind = 'ds-store' | 'apple-double' | 'macos-metadata' | 'editor-swap' | 'temporary';

export interface JunkClassification {
  kind: JunkKind;
  /** Plain-language reason, shown in the preview. */
  why: string;
}

/** Exact file names, matched case-sensitively — these are the names macOS writes. */
const EXACT_FILES = new Map<string, JunkClassification>([
  ['.DS_Store', { kind: 'ds-store', why: 'macOS Finder folder-view settings' }],
  ['.DS_Store?', { kind: 'ds-store', why: 'macOS Finder folder-view settings' }],
  ['.localized', { kind: 'macos-metadata', why: 'macOS folder-name localisation marker' }],
  ['.apdisk', { kind: 'macos-metadata', why: 'macOS Time Machine marker' }],
  ['.VolumeIcon.icns', { kind: 'macos-metadata', why: 'macOS volume icon' }],
  // Finder's custom-icon file really does end in a carriage return.
  ['Icon\r', { kind: 'macos-metadata', why: 'macOS Finder custom icon' }],
  ['Thumbs.db', { kind: 'temporary', why: 'Windows Explorer thumbnail cache' }],
  ['ehthumbs.db', { kind: 'temporary', why: 'Windows Explorer thumbnail cache' }],
  ['desktop.ini', { kind: 'temporary', why: 'Windows Explorer folder settings' }],
]);

/** Exact directory names. */
const EXACT_DIRECTORIES = new Map<string, JunkClassification>([
  ['__MACOSX', { kind: 'macos-metadata', why: 'resource forks added when Finder made a zip' }],
  ['.Spotlight-V100', { kind: 'macos-metadata', why: 'macOS Spotlight index' }],
  ['.Trashes', { kind: 'macos-metadata', why: 'macOS volume trash' }],
  ['.fseventsd', { kind: 'macos-metadata', why: 'macOS filesystem event log' }],
  ['.TemporaryItems', { kind: 'macos-metadata', why: 'macOS temporary items' }],
  ['.DocumentRevisions-V100', { kind: 'macos-metadata', why: 'macOS document versions' }],
  ['.AppleDouble', { kind: 'apple-double', why: 'AppleDouble resource forks' }],
  ['.AppleDB', { kind: 'macos-metadata', why: 'legacy AppleShare database' }],
  ['.AppleDesktop', { kind: 'macos-metadata', why: 'legacy AppleShare desktop database' }],
]);

/**
 * Patterns, in order. Each is anchored and specific; none is a general
 * wildcard, because a general wildcard here deletes someone's work.
 */
const PATTERNS: ReadonlyArray<{ test: RegExp; classification: JunkClassification }> = [
  // AppleDouble twins. `._` is reserved by macOS for exactly this.
  { test: /^\._/, classification: { kind: 'apple-double', why: 'AppleDouble resource fork' } },
  // Vim swap and undo files.
  {
    test: /^\..+\.sw[a-p]$/,
    classification: { kind: 'editor-swap', why: 'Vim swap file' },
  },
  { test: /^\..+\.un~$/, classification: { kind: 'editor-swap', why: 'Vim undo file' } },
  // Emacs autosave (#file#) and lock (.#file) files.
  { test: /^#.+#$/, classification: { kind: 'editor-swap', why: 'Emacs auto-save file' } },
  { test: /^\.#.+/, classification: { kind: 'editor-swap', why: 'Emacs lock file' } },
  // Editor and generic backups.
  { test: /~$/, classification: { kind: 'editor-swap', why: 'editor backup file' } },
  { test: /\.bak$/i, classification: { kind: 'temporary', why: 'backup file' } },
  { test: /\.orig$/i, classification: { kind: 'temporary', why: 'merge-conflict leftover' } },
  { test: /\.rej$/i, classification: { kind: 'temporary', why: 'rejected patch hunk' } },
  { test: /\.tmp$/i, classification: { kind: 'temporary', why: 'temporary file' } },
  { test: /\.temp$/i, classification: { kind: 'temporary', why: 'temporary file' } },
  {
    test: /\.crdownload$/i,
    classification: { kind: 'temporary', why: 'partial browser download' },
  },
  { test: /\.part$/i, classification: { kind: 'temporary', why: 'partial download' } },
  { test: /\.download$/i, classification: { kind: 'temporary', why: 'partial download' } },
];

/** Classifies one path segment, or returns undefined if it is not junk. */
export function classifyJunk(name: string, isDirectory: boolean): JunkClassification | undefined {
  if (isDirectory) return EXACT_DIRECTORIES.get(name);

  const exact = EXACT_FILES.get(name);
  if (exact) return exact;

  for (const { test, classification } of PATTERNS) {
    if (test.test(name)) return classification;
  }
  return undefined;
}

/** True when any segment of a relative path is a junk directory. */
export function isInsideJunkDirectory(relativePath: string): boolean {
  const segments = relativePath.split('/');
  return segments.slice(0, -1).some((segment) => EXACT_DIRECTORIES.has(segment));
}
