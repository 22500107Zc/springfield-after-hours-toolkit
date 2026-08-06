import fs from 'node:fs';
import path from 'node:path';
import { sha256 } from '@sah/core';
import { PocketToolError } from './errors.js';
import { entriesIn, firstValue, parseIni, unescapeIniPath, type ParsedIni } from './ini.js';
import { comparePaths, readableReason, resolveRoot, scanDirectory } from './scan.js';

/**
 * Pocket tool 3 — Mod Conflict Checker.
 *
 * Compares two or more mod folders and reports where they overlap:
 *
 * - the same relative path shipped by more than one mod, exactly;
 * - paths that collide only when case is ignored;
 * - the same game path claimed in more than one `CustomFiles.ini`;
 * - the same `InternalName` in more than one `Meta.ini`.
 *
 * Every overlap is reported with a SHA-256 per copy, so "these two mods both
 * ship this file" can be separated from "these two mods ship a *different*
 * version of this file".
 *
 * **These are potential file conflicts, not runtime conflicts.** Nothing here
 * predicts what the game or the Mod Launcher does when two mods overlap — load
 * order and override behaviour are not documented in any source this toolkit
 * has verified. Two mods that overlap may work together perfectly; two mods
 * that do not overlap at all may still break each other. This tool compares
 * files, and says only what files say.
 */

/** Sections of CustomFiles.ini whose keys are game paths a mod lays claim to. */
const PATH_CLAIMING_SECTIONS = ['PathHandlers', 'PathRedirections', 'AdditionalFiles'] as const;

/**
 * Files at a mod's root that every mod has one of, by design.
 *
 * Reporting "both mods contain Meta.ini" is true and useless — it would fire on
 * every comparison ever run and bury the overlaps that matter. These are the
 * mod's own metadata, not content it supplies to the game. Matched at the root
 * only: a `Meta.ini` nested inside `Resources/` is not one of these.
 */
const PER_MOD_METADATA = new Set(['meta.ini', 'customfiles.ini', 'customfiles.lua']);

function isPerModMetadata(relativePath: string): boolean {
  return !relativePath.includes('/') && PER_MOD_METADATA.has(relativePath.toLowerCase());
}

export type ConflictKind = 'exact-path' | 'case-insensitive-path' | 'game-path' | 'internal-name';

export interface ConflictParticipant {
  /** The mod's display name — its `Meta.ini` Title, or the folder name. */
  mod: string;
  /** Where in that mod the claim was found. */
  where: string;
  sha256?: string;
  bytes?: number;
}

export interface PotentialConflict {
  kind: ConflictKind;
  /** The contested path, game path, or identifier. */
  subject: string;
  participants: ConflictParticipant[];
  /** For file conflicts: true when every copy is byte-identical. */
  identical?: boolean;
}

export interface InspectedMod {
  /** Folder name only — absolute paths are kept out of shareable reports. */
  folder: string;
  name: string;
  internalName?: string;
  fileCount: number;
  claimedGamePaths: string[];
  /** Things worth knowing about this folder, in plain language. */
  notes: string[];
}

export interface ConflictReport {
  mods: InspectedMod[];
  conflicts: PotentialConflict[];
  counts: Record<ConflictKind, number>;
  ok: boolean;
}

export function checkConflicts(roots: readonly string[]): ConflictReport {
  if (roots.length < 2) {
    throw new PocketToolError(
      'Comparing mods needs at least two folders.',
      'Example: sah pocket conflicts ./mod-a ./mod-b',
    );
  }

  const resolved = roots.map(resolveRoot);
  const seen = new Set<string>();
  for (const root of resolved) {
    if (seen.has(root)) {
      throw new PocketToolError(
        `The same folder was given twice: ${root}`,
        'Each folder can only be compared once.',
      );
    }
    seen.add(root);
  }

  const inspected = resolved.map(inspectMod);
  const mods = inspected.map((entry) => entry.mod);

  const conflicts = [
    ...fileConflicts(inspected),
    ...gamePathConflicts(mods),
    ...internalNameConflicts(mods),
  ].sort((a, b) => comparePaths(a.kind, b.kind) || comparePaths(a.subject, b.subject));

  const counts: Record<ConflictKind, number> = {
    'exact-path': 0,
    'case-insensitive-path': 0,
    'game-path': 0,
    'internal-name': 0,
  };
  for (const conflict of conflicts) counts[conflict.kind] += 1;

  return { mods, conflicts, counts, ok: conflicts.length === 0 };
}

interface ModContents {
  mod: InspectedMod;
  /** Relative POSIX path -> hash and size. Read once, passed along. */
  files: Map<string, { sha256: string; bytes: number }>;
}

function inspectMod(root: string): ModContents {
  const notes: string[] = [];
  const meta = readIniIfPresent(root, 'Meta.ini');
  const customFiles = readIniIfPresent(root, 'CustomFiles.ini');

  if (!meta) notes.push('no Meta.ini — this may not be a mod folder');
  if (!customFiles) notes.push('no CustomFiles.ini — this mod claims no game paths by name');

  const name = (meta && firstValue(meta, 'Miscellaneous', 'Title')) || path.basename(root);
  const internalName = meta ? firstValue(meta, 'Miscellaneous', 'InternalName') : undefined;

  const scan = scanDirectory({ root });
  const files = new Map<string, { sha256: string; bytes: number }>();
  for (const file of scan.files) {
    const absolute = path.join(root, ...file.path.split('/'));
    try {
      const contents = fs.readFileSync(absolute);
      files.set(file.path, { sha256: sha256(contents), bytes: contents.byteLength });
    } catch (error) {
      notes.push(`could not read ${file.path}: ${readableReason(error)}`);
    }
  }
  for (const link of scan.symlinks) {
    notes.push(`symbolic link not followed: ${link.path}`);
  }

  const claimed = new Set<string>();
  if (customFiles) {
    for (const section of PATH_CLAIMING_SECTIONS) {
      for (const entry of entriesIn(customFiles, section)) {
        claimed.add(normaliseGamePath(entry.key));
      }
    }
  }

  const mod: InspectedMod = {
    folder: path.basename(root),
    name,
    ...(internalName ? { internalName } : {}),
    fileCount: files.size,
    claimedGamePaths: [...claimed].sort(comparePaths),
    notes,
  };

  return { mod, files };
}

function readIniIfPresent(root: string, wanted: string): ParsedIni | undefined {
  // A mod authored on Windows may spell these any way; look, do not assume.
  const target = wanted.toLowerCase();
  let match: fs.Dirent | undefined;
  try {
    match = fs
      .readdirSync(root, { withFileTypes: true })
      .find((entry) => entry.isFile() && entry.name.toLowerCase() === target);
  } catch {
    return undefined;
  }
  if (!match) return undefined;

  try {
    return parseIni(fs.readFileSync(path.join(root, match.name), 'utf8'));
  } catch {
    return undefined;
  }
}

/**
 * Game paths are compared with slashes unified, leading slashes dropped and
 * case ignored: two mods writing `scripts\missions\x.mfk` and
 * `Scripts/Missions/X.mfk` are laying claim to the same thing, whatever the
 * game does with the difference.
 */
function normaliseGamePath(key: string): string {
  return unescapeIniPath(key).replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
}

function fileConflicts(inspected: readonly ModContents[]): PotentialConflict[] {
  const exact = new Map<string, ConflictParticipant[]>();
  const folded = new Map<string, Array<{ actual: string; participant: ConflictParticipant }>>();

  for (const { mod, files } of inspected) {
    for (const [relative, info] of [...files.entries()].sort(([a], [b]) => comparePaths(a, b))) {
      if (isPerModMetadata(relative)) continue;

      const participant: ConflictParticipant = {
        mod: mod.name,
        where: relative,
        sha256: info.sha256,
        bytes: info.bytes,
      };

      const exactList = exact.get(relative) ?? [];
      exactList.push(participant);
      exact.set(relative, exactList);

      const key = relative.toLowerCase();
      const foldedList = folded.get(key) ?? [];
      foldedList.push({ actual: relative, participant });
      folded.set(key, foldedList);
    }
  }

  const conflicts: PotentialConflict[] = [];

  for (const [subject, participants] of exact) {
    if (participants.length < 2) continue;
    conflicts.push({
      kind: 'exact-path',
      subject,
      participants,
      identical: new Set(participants.map((p) => p.sha256)).size === 1,
    });
  }

  // Reported separately, and only when the exact paths differ — otherwise every
  // exact conflict would be listed a second time under a different heading.
  for (const [subject, members] of folded) {
    if (members.length < 2) continue;
    if (new Set(members.map((member) => member.actual)).size < 2) continue;
    conflicts.push({
      kind: 'case-insensitive-path',
      subject,
      participants: members.map((member) => member.participant),
      identical: new Set(members.map((member) => member.participant.sha256)).size === 1,
    });
  }

  return conflicts;
}

function gamePathConflicts(mods: readonly InspectedMod[]): PotentialConflict[] {
  const claims = new Map<string, ConflictParticipant[]>();
  for (const mod of mods) {
    for (const claimed of mod.claimedGamePaths) {
      const list = claims.get(claimed) ?? [];
      list.push({ mod: mod.name, where: 'CustomFiles.ini' });
      claims.set(claimed, list);
    }
  }

  return [...claims.entries()]
    .filter(([, participants]) => participants.length > 1)
    .map(([subject, participants]) => ({ kind: 'game-path' as const, subject, participants }));
}

function internalNameConflicts(mods: readonly InspectedMod[]): PotentialConflict[] {
  const byName = new Map<string, ConflictParticipant[]>();
  for (const mod of mods) {
    if (!mod.internalName) continue;
    const key = mod.internalName.toLowerCase();
    const list = byName.get(key) ?? [];
    list.push({ mod: mod.name, where: 'Meta.ini' });
    byName.set(key, list);
  }

  return [...byName.entries()]
    .filter(([, participants]) => participants.length > 1)
    .map(([subject, participants]) => ({ kind: 'internal-name' as const, subject, participants }));
}
