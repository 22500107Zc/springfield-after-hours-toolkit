import fs from 'node:fs';
import path from 'node:path';
import { buildManifest, readManifest, type Manifest, type ManifestFile } from './manifest.js';
import { missing } from './errors.js';
import { comparePaths } from './scan.js';

/**
 * Pocket tool 5 — Release Difference Viewer.
 *
 * What actually changed between two builds of a mod. Either side may be a
 * folder or a manifest, so it works before a release ("what have I changed?")
 * and after one ("is the download the same as the build?").
 *
 * Beyond added/removed/modified it reports two things a plain listing misses:
 *
 * - **Rename candidates.** A file whose bytes are unchanged but whose path
 *   moved. Called *candidates* because identical content at two paths is
 *   evidence, not proof — two empty files are byte-identical and unrelated.
 * - **Case-only changes.** `Scripts/Main.lua` becoming `scripts/main.lua` is a
 *   real, shippable difference that a case-insensitive Mac will not show you.
 *
 * File-level only: no attempt is made to diff contents. A mod is mostly binary
 * game data, and a byte diff of a P3D tells nobody anything.
 */

export type ChangeKind = 'added' | 'removed' | 'modified' | 'unchanged';

export interface FileChange {
  path: string;
  kind: ChangeKind;
  beforeBytes?: number;
  afterBytes?: number;
  beforeSha256?: string;
  afterSha256?: string;
}

export interface RenameCandidate {
  from: string;
  to: string;
  bytes: number;
  sha256: string;
}

export interface CaseOnlyChange {
  from: string;
  to: string;
  /** True when the contents also changed; the rename is then not the whole story. */
  contentAlsoChanged: boolean;
}

export interface DiffSide {
  name: string;
  fileCount: number;
  totalBytes: number;
  contentId: string;
}

export interface ReleaseDiff {
  before: DiffSide;
  after: DiffSide;
  identical: boolean;
  counts: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
    renamed: number;
    caseOnly: number;
  };
  added: FileChange[];
  removed: FileChange[];
  modified: FileChange[];
  renameCandidates: RenameCandidate[];
  caseOnlyChanges: CaseOnlyChange[];
  /** Included only when explicitly asked for; otherwise just counted. */
  unchanged: FileChange[];
  /** Net size change in bytes. Negative means the release got smaller. */
  byteDelta: number;
}

/** Resolves a folder path or a manifest file path into a manifest. */
export function resolveSide(target: string): Manifest {
  const absolute = path.resolve(target);
  if (!fs.existsSync(absolute)) throw missing(absolute);
  if (fs.statSync(absolute).isDirectory()) return buildManifest({ root: absolute });
  return readManifest(absolute);
}

export interface ReleaseDiffOptions {
  before: string;
  after: string;
  /** List unchanged files individually as well as counting them. */
  includeUnchanged?: boolean;
}

export function diffReleases(options: ReleaseDiffOptions): ReleaseDiff {
  return compareManifests(
    resolveSide(options.before),
    resolveSide(options.after),
    options.includeUnchanged ?? false,
  );
}

export function compareManifests(
  before: Manifest,
  after: Manifest,
  includeUnchanged = false,
): ReleaseDiff {
  const beforeFiles = new Map(before.files.map((file) => [file.path, file]));
  const afterFiles = new Map(after.files.map((file) => [file.path, file]));

  const added: FileChange[] = [];
  const removed: FileChange[] = [];
  const modified: FileChange[] = [];
  const unchanged: FileChange[] = [];
  let unchangedCount = 0;

  const allPaths = [...new Set([...beforeFiles.keys(), ...afterFiles.keys()])].sort(comparePaths);

  for (const filePath of allPaths) {
    const from = beforeFiles.get(filePath);
    const to = afterFiles.get(filePath);

    if (from && to) {
      if (from.sha256 === to.sha256) {
        unchangedCount += 1;
        if (includeUnchanged) {
          unchanged.push({
            path: filePath,
            kind: 'unchanged',
            beforeBytes: from.bytes,
            afterBytes: to.bytes,
            beforeSha256: from.sha256,
            afterSha256: to.sha256,
          });
        }
      } else {
        modified.push({
          path: filePath,
          kind: 'modified',
          beforeBytes: from.bytes,
          afterBytes: to.bytes,
          beforeSha256: from.sha256,
          afterSha256: to.sha256,
        });
      }
      continue;
    }

    if (to) {
      added.push({ path: filePath, kind: 'added', afterBytes: to.bytes, afterSha256: to.sha256 });
      continue;
    }
    if (from) {
      removed.push({
        path: filePath,
        kind: 'removed',
        beforeBytes: from.bytes,
        beforeSha256: from.sha256,
      });
    }
  }

  const caseOnlyChanges = findCaseOnlyChanges(removed, added, beforeFiles, afterFiles);
  const caseOnlyFrom = new Set(caseOnlyChanges.map((change) => change.from));
  const caseOnlyTo = new Set(caseOnlyChanges.map((change) => change.to));

  // A case-only rename is already fully described as such; counting it again as
  // an unrelated add and delete would double-report the same change.
  const renameCandidates = findRenameCandidates(
    removed.filter((change) => !caseOnlyFrom.has(change.path)),
    added.filter((change) => !caseOnlyTo.has(change.path)),
  );

  return {
    before: summarise(before),
    after: summarise(after),
    identical: before.contentId === after.contentId,
    counts: {
      added: added.length,
      removed: removed.length,
      modified: modified.length,
      unchanged: unchangedCount,
      renamed: renameCandidates.length,
      caseOnly: caseOnlyChanges.length,
    },
    added,
    removed,
    modified,
    renameCandidates,
    caseOnlyChanges,
    unchanged,
    byteDelta: after.totalBytes - before.totalBytes,
  };
}

/**
 * Pairs a removed path with an added path whose contents are identical.
 *
 * Each side is used at most once, and pairing is done in sorted order so the
 * result does not depend on map iteration. When several removed files share a
 * hash — empty files, duplicated assets — the pairing is arbitrary but stable,
 * which is why these are reported as candidates.
 */
function findRenameCandidates(
  removed: readonly FileChange[],
  added: readonly FileChange[],
): RenameCandidate[] {
  const availableByHash = new Map<string, FileChange[]>();
  for (const change of [...added].sort((a, b) => comparePaths(a.path, b.path))) {
    if (!change.afterSha256) continue;
    const list = availableByHash.get(change.afterSha256) ?? [];
    list.push(change);
    availableByHash.set(change.afterSha256, list);
  }

  const candidates: RenameCandidate[] = [];
  for (const change of [...removed].sort((a, b) => comparePaths(a.path, b.path))) {
    if (!change.beforeSha256) continue;
    const matches = availableByHash.get(change.beforeSha256);
    const match = matches?.shift();
    if (!match) continue;

    candidates.push({
      from: change.path,
      to: match.path,
      bytes: match.afterBytes ?? change.beforeBytes ?? 0,
      sha256: change.beforeSha256,
    });
  }

  return candidates.sort((a, b) => comparePaths(a.from, b.from));
}

/**
 * Finds paths that differ only by case between the two sides.
 *
 * Detected independently of content, because a case-only rename that also
 * edits the file is still a case-only *path* change — and it is the path change
 * that will surprise someone on Linux.
 */
function findCaseOnlyChanges(
  removed: readonly FileChange[],
  added: readonly FileChange[],
  beforeFiles: ReadonlyMap<string, ManifestFile>,
  afterFiles: ReadonlyMap<string, ManifestFile>,
): CaseOnlyChange[] {
  const addedByFolded = new Map<string, string[]>();
  for (const change of added) {
    const key = change.path.toLowerCase();
    const list = addedByFolded.get(key) ?? [];
    list.push(change.path);
    addedByFolded.set(key, list);
  }

  const changes: CaseOnlyChange[] = [];
  for (const change of [...removed].sort((a, b) => comparePaths(a.path, b.path))) {
    const matches = addedByFolded.get(change.path.toLowerCase());
    const to = matches?.shift();
    if (to === undefined) continue;

    changes.push({
      from: change.path,
      to,
      contentAlsoChanged: beforeFiles.get(change.path)?.sha256 !== afterFiles.get(to)?.sha256,
    });
  }

  return changes.sort((a, b) => comparePaths(a.from, b.from));
}

function summarise(manifest: Manifest): DiffSide {
  return {
    name: manifest.name,
    fileCount: manifest.fileCount,
    totalBytes: manifest.totalBytes,
    contentId: manifest.contentId,
  };
}

/** True when the two sides differ in any way this tool reports. */
export function hasDifferences(diff: ReleaseDiff): boolean {
  return (
    diff.counts.added > 0 ||
    diff.counts.removed > 0 ||
    diff.counts.modified > 0 ||
    diff.counts.caseOnly > 0
  );
}
