import fs from 'node:fs';
import path from 'node:path';
import { sha256, stableStringify } from '@sah/core';
import { PocketToolError } from './errors.js';
import { comparePaths, readableReason, scanDirectory } from './scan.js';

/**
 * Pocket tool 4 — Manifest Maker.
 *
 * An exact record of what is in a mod folder: every file, its size, its
 * SHA-256. It answers "is what I uploaded what I built?", and it is the input
 * the Release Difference Viewer compares.
 *
 * **Determinism is the feature.** Two runs over unchanged files produce
 * byte-identical manifests, on any machine, on any platform. That requires
 * four things, all of them deliberate:
 *
 * - no timestamps anywhere in the output;
 * - paths recorded POSIX-style, so a Windows run matches a macOS run;
 * - sorting by code unit rather than locale, so ICU differences cannot reorder;
 * - the manifest excluding itself, so writing it into the folder it describes
 *   does not change what the next run describes.
 *
 * **Symlinks are recorded, never followed.** A link's target may be outside the
 * folder, or may not exist, and hashing through one would let a manifest
 * describe files that are not in the mod at all. They are listed separately,
 * with their target text, and are not part of the content hash.
 */

export const MANIFEST_FORMAT = 'shar-pocket-manifest';
export const MANIFEST_VERSION = 1;
export const DEFAULT_MANIFEST_NAME = 'manifest.json';

export interface ManifestFile {
  /** POSIX-style path relative to the manifested folder. */
  path: string;
  bytes: number;
  sha256: string;
}

export interface ManifestSymlink {
  path: string;
  /** The link text exactly as stored — never resolved into the manifest. */
  target: string;
  /** True when the target lies outside the manifested folder. */
  escapes: boolean;
  dangling: boolean;
}

export interface Manifest {
  format: typeof MANIFEST_FORMAT;
  version: typeof MANIFEST_VERSION;
  /**
   * The folder's own name. The absolute path is deliberately *not* recorded:
   * it would leak a local home directory into a file people share, and it
   * would make two manifests of the same content differ.
   */
  name: string;
  fileCount: number;
  totalBytes: number;
  /** SHA-256 over every path and hash — one string identifying the whole set. */
  contentId: string;
  files: ManifestFile[];
  symlinks: ManifestSymlink[];
  /** Anything that could not be read, so a short manifest is never silent. */
  skipped: Array<{ path: string; reason: string }>;
}

export interface ManifestOptions {
  root: string;
  /**
   * Relative POSIX paths to leave out. The manifest's own filename is excluded
   * automatically when it is being written into the folder it describes.
   */
  exclude?: readonly string[];
}

export function buildManifest(options: ManifestOptions): Manifest {
  const scan = scanDirectory({ root: options.root });
  const excluded = new Set(options.exclude ?? []);

  const files: ManifestFile[] = [];
  const skipped: Array<{ path: string; reason: string }> = scan.unreadable.map((entry) => ({
    path: entry.path,
    reason: entry.reason,
  }));

  for (const file of scan.files) {
    if (excluded.has(file.path)) continue;
    const absolute = path.join(scan.root, ...file.path.split('/'));
    try {
      const contents = fs.readFileSync(absolute);
      files.push({ path: file.path, bytes: contents.byteLength, sha256: sha256(contents) });
    } catch (error) {
      skipped.push({ path: file.path, reason: readableReason(error) });
    }
  }

  files.sort((a, b) => comparePaths(a.path, b.path));
  skipped.sort((a, b) => comparePaths(a.path, b.path));

  return {
    format: MANIFEST_FORMAT,
    version: MANIFEST_VERSION,
    name: path.basename(scan.root),
    fileCount: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
    contentId: computeContentId(files),
    files,
    symlinks: scan.symlinks.map((link) => ({
      path: link.path,
      target: link.target,
      escapes: link.escapes,
      dangling: link.dangling,
    })),
    skipped,
  };
}

/**
 * One hash covering the whole file set.
 *
 * Newline-separated `path<TAB>hash` lines: the tab cannot appear in a path
 * produced by the scanner, so no two different file sets can produce the same
 * input string.
 */
function computeContentId(files: readonly ManifestFile[]): string {
  return sha256(files.map((file) => `${file.path}\t${file.sha256}`).join('\n'));
}

/** The exact bytes to write to disk. */
export function serialiseManifest(manifest: Manifest): string {
  return `${stableStringify(manifest)}\n`;
}

/** Human-readable form, for `--format text`. */
export function renderManifestText(manifest: Manifest): string {
  const lines: string[] = [];
  lines.push(`${manifest.name}`);
  lines.push(`${manifest.fileCount} files, ${manifest.totalBytes} bytes`);
  lines.push(`content id ${manifest.contentId}`);
  lines.push('');
  for (const file of manifest.files) {
    lines.push(`${file.sha256}  ${String(file.bytes).padStart(10)}  ${file.path}`);
  }
  if (manifest.symlinks.length > 0) {
    lines.push('');
    lines.push('symbolic links (recorded, not followed):');
    for (const link of manifest.symlinks) {
      const notes = [
        link.escapes ? 'points outside' : 'points inside',
        link.dangling ? 'broken' : '',
      ]
        .filter(Boolean)
        .join(', ');
      lines.push(`  ${link.path} -> ${link.target}  (${notes})`);
    }
  }
  if (manifest.skipped.length > 0) {
    lines.push('');
    lines.push('not included:');
    for (const entry of manifest.skipped) lines.push(`  ${entry.path}: ${entry.reason}`);
  }
  return `${lines.join('\n')}\n`;
}

/**
 * Reads a manifest, rejecting anything that is not one.
 *
 * Strictness matters here: the diff viewer takes a path from the user, and
 * quietly treating an unrelated JSON file as an empty manifest would report
 * every single file as deleted.
 */
export function readManifest(file: string): Manifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new PocketToolError(
      `That file could not be read as JSON: ${file}`,
      `The file may be damaged or may not be a manifest. (${readableReason(error)})`,
    );
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new PocketToolError(`That file is not a manifest: ${file}`);
  }

  const candidate = parsed as Partial<Manifest>;
  if (candidate.format !== MANIFEST_FORMAT) {
    throw new PocketToolError(
      `That file is not a manifest made by this tool: ${file}`,
      `Manifests start with "format": "${MANIFEST_FORMAT}". Make one with: sah pocket manifest <folder>`,
    );
  }
  if (candidate.version !== MANIFEST_VERSION) {
    throw new PocketToolError(
      `That manifest was written by a different version of this tool: ${file}`,
      `Found version ${String(candidate.version)}; this tool reads version ${MANIFEST_VERSION}. Regenerate it.`,
    );
  }
  if (!Array.isArray(candidate.files)) {
    throw new PocketToolError(`That manifest is damaged: "files" is missing from ${file}`);
  }

  return {
    ...(candidate as Manifest),
    symlinks: candidate.symlinks ?? [],
    skipped: candidate.skipped ?? [],
  };
}
