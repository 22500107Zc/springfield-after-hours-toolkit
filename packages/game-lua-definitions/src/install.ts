import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { normaliseText, resolveWithin, sha256 } from '@sah/core';
import { loadUpstreamLock, type UpstreamDependency } from '@sah/adapter-game-lua';

/**
 * Prepares a mod-authoring workspace to use both definition sets.
 *
 * This is the only part of the package that writes into someone else's project,
 * so the rules are strict:
 *
 *   - Every path is resolved inside the target project. Traversal is refused.
 *   - Existing editor settings are never overwritten. They are *merged*, and
 *     the merge is shown as a plan unless the caller passes `apply`.
 *   - Downloading official definitions verifies each file against a pinned
 *     SHA-256 before writing it, and fails loudly rather than installing a
 *     partial set.
 */

/** Where our generated definitions go inside a mod project. */
export const GAME_DEFINITIONS_DIRECTORY = 'Resources/lib/external/sah-game-lua-definitions';
/** Donut Team's own recommended location for their definitions. */
export const OFFICIAL_DEFINITIONS_DIRECTORY = 'Resources/lib/external/lucas-mod-launcher-lua';
/** Lua runtime the Launcher's Custom Files scripting uses. */
export const LUA_RUNTIME_VERSION = 'Lua 5.3';

export type PlannedAction = 'create' | 'overwrite' | 'unchanged' | 'merge';

export interface PlannedFile {
  /** Path relative to the project root, forward slashes. */
  path: string;
  action: PlannedAction;
  contents: string;
  /** Human-readable note about what changes and why. */
  note?: string;
}

export interface InstallPlan {
  projectRoot: string;
  files: PlannedFile[];
  /** Warnings that do not stop the install. */
  warnings: string[];
  /** Problems that do stop it. */
  errors: string[];
  /** True when nothing would change. */
  upToDate: boolean;
}

export interface InstallOptions {
  projectRoot: string;
  /** Contents of the generated Game.meta.lua. */
  definitions: string;
  /** Also install Donut Team's official Custom Files definitions. */
  withOfficial: boolean;
  /**
   * Directory holding an already-fetched copy of the official definitions
   * (this repository's `vendor/`). When absent, they are downloaded.
   */
  officialSourceDirectory?: string | undefined;
  /** Fetches the official definitions when they are not already present. */
  download?: ((url: string) => Promise<Buffer>) | undefined;
}

interface VsCodeSettings {
  [key: string]: unknown;
  'Lua.runtime.version'?: unknown;
  'Lua.workspace.library'?: unknown;
}

/**
 * Merges our required Lua settings into whatever the project already has.
 *
 * Unknown keys are preserved untouched, and the library list is a union rather
 * than a replacement — someone may already point LuaLS at their own stubs.
 */
export function mergeVsCodeSettings(
  existing: VsCodeSettings,
  libraries: readonly string[],
): { merged: VsCodeSettings; changed: boolean; notes: string[] } {
  const merged: VsCodeSettings = { ...existing };
  const notes: string[] = [];
  let changed = false;

  const currentRuntime = merged['Lua.runtime.version'];
  if (currentRuntime === undefined) {
    merged['Lua.runtime.version'] = LUA_RUNTIME_VERSION;
    notes.push(`set Lua.runtime.version to "${LUA_RUNTIME_VERSION}"`);
    changed = true;
  } else if (currentRuntime !== LUA_RUNTIME_VERSION) {
    // Do not silently retarget someone's runtime.
    notes.push(
      `left Lua.runtime.version as "${String(currentRuntime)}" (this toolkit expects "${LUA_RUNTIME_VERSION}")`,
    );
  }

  const currentLibrary = Array.isArray(merged['Lua.workspace.library'])
    ? (merged['Lua.workspace.library'] as unknown[]).filter(
        (entry): entry is string => typeof entry === 'string',
      )
    : [];

  const union = [...currentLibrary];
  for (const library of libraries) {
    if (!union.includes(library)) {
      union.push(library);
      notes.push(`added ${library} to Lua.workspace.library`);
      changed = true;
    }
  }
  if (changed || currentLibrary.length !== union.length) {
    merged['Lua.workspace.library'] = union;
  }

  return { merged, changed, notes };
}

function readJsonIfPresent(file: string): { value: VsCodeSettings; malformed: boolean } {
  if (!fs.existsSync(file)) return { value: {}, malformed: false };
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { value: {}, malformed: true };
    }
    return { value: parsed as VsCodeSettings, malformed: false };
  } catch {
    return { value: {}, malformed: true };
  }
}

export function officialDependency(): UpstreamDependency {
  const lock = loadUpstreamLock();
  const dependency = lock.dependencies['donutteam/lucas-mod-launcher-lua'];
  if (!dependency) {
    throw new Error('upstream.lock.json is missing donutteam/lucas-mod-launcher-lua.');
  }
  return dependency;
}

/**
 * Builds the plan without writing anything.
 *
 * Separating plan from apply is what makes "never overwrite editor settings
 * without permission" enforceable rather than aspirational.
 */
export async function planInstall(options: InstallOptions): Promise<InstallPlan> {
  const projectRoot = path.resolve(options.projectRoot);
  const files: PlannedFile[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!fs.existsSync(projectRoot)) {
    errors.push(`Project directory does not exist: ${projectRoot}`);
    return { projectRoot, files, warnings, errors, upToDate: false };
  }
  if (!fs.statSync(projectRoot).isDirectory()) {
    errors.push(`Not a directory: ${projectRoot}`);
    return { projectRoot, files, warnings, errors, upToDate: false };
  }

  const plan = (relativePath: string, contents: string, note?: string): void => {
    const safety = resolveWithin(projectRoot, relativePath);
    if (!safety.safe) {
      errors.push(`Refused path "${relativePath}": ${safety.reason}.`);
      return;
    }
    const exists = fs.existsSync(safety.resolved);
    const current = exists ? fs.readFileSync(safety.resolved, 'utf8') : undefined;
    files.push({
      path: relativePath,
      action: !exists ? 'create' : current === contents ? 'unchanged' : 'overwrite',
      contents,
      ...(note ? { note } : {}),
    });
  };

  // --- our generated definitions ---------------------------------------------
  plan(
    `${GAME_DEFINITIONS_DIRECTORY}/Game.meta.lua`,
    options.definitions,
    'Game.* mission command definitions, generated from the verified command registry.',
  );

  // --- Donut Team's official definitions --------------------------------------
  const libraries = [GAME_DEFINITIONS_DIRECTORY];

  if (options.withOfficial) {
    const dependency = officialDependency();
    libraries.push(OFFICIAL_DEFINITIONS_DIRECTORY);

    for (const file of dependency.files) {
      let contents: Buffer | undefined;

      const cached = options.officialSourceDirectory
        ? path.join(options.officialSourceDirectory, file.path)
        : undefined;

      if (cached && fs.existsSync(cached)) {
        contents = fs.readFileSync(cached);
      } else if (options.download) {
        const url = `https://raw.githubusercontent.com/${dependency.repository}/${dependency.commit}/${file.path}`;
        try {
          contents = await options.download(url);
        } catch (error) {
          errors.push(
            `Could not download ${file.path}: ${(error as Error).message}. ` +
              'Refusing to install an incomplete definition set.',
          );
          continue;
        }
      } else {
        errors.push(
          `Official definitions are not available locally and no downloader was provided (${file.path}).`,
        );
        continue;
      }

      if (file.sha256) {
        const actual = createHash('sha256').update(contents).digest('hex');
        if (actual !== file.sha256) {
          errors.push(
            `Hash mismatch for ${file.path}: expected ${file.sha256}, got ${actual}. Refusing to install it.`,
          );
          continue;
        }
      }

      // Flatten `src/` away so LuaLS sees one library directory, and keep the
      // licence alongside the files it covers.
      const relative = file.path.startsWith('src/') ? file.path.slice('src/'.length) : file.path;
      plan(
        `${OFFICIAL_DEFINITIONS_DIRECTORY}/${relative}`,
        contents.toString('utf8'),
        `Donut Team, ${dependency.license}, pinned to ${dependency.commit.slice(0, 12)}.`,
      );
    }
  } else {
    warnings.push(
      "Donut Team's official Custom Files definitions were not installed. Without them you get completion for Game.* but not for Output, GetPath, GetModPath and the rest. Re-run with --with-official.",
    );
  }

  // --- editor settings --------------------------------------------------------
  const settingsRelative = '.vscode/settings.json';
  const settingsSafety = resolveWithin(projectRoot, settingsRelative);
  if (!settingsSafety.safe) {
    errors.push(`Refused path "${settingsRelative}": ${settingsSafety.reason}.`);
  } else {
    const { value: existingSettings, malformed } = readJsonIfPresent(settingsSafety.resolved);
    if (malformed) {
      errors.push(
        `${settingsRelative} exists but is not a JSON object. Refusing to touch it — fix or move it first.`,
      );
    } else {
      const { merged, changed, notes } = mergeVsCodeSettings(existingSettings, libraries);
      const contents = normaliseText(JSON.stringify(merged, null, 2));
      const exists = fs.existsSync(settingsSafety.resolved);
      files.push({
        path: settingsRelative,
        action: !exists ? 'create' : changed ? 'merge' : 'unchanged',
        contents,
        note:
          notes.length > 0
            ? notes.join('; ')
            : 'already configured; existing settings left untouched',
      });
    }
  }

  const upToDate = errors.length === 0 && files.every((file) => file.action === 'unchanged');

  return { projectRoot, files, warnings, errors, upToDate };
}

export interface ApplyResult {
  written: string[];
  skipped: string[];
}

/** Writes a plan. Refuses if the plan has errors. */
export function applyInstall(plan: InstallPlan): ApplyResult {
  if (plan.errors.length > 0) {
    throw new Error(`Refusing to apply a plan with ${plan.errors.length} error(s).`);
  }

  const written: string[] = [];
  const skipped: string[] = [];

  for (const file of plan.files) {
    if (file.action === 'unchanged') {
      skipped.push(file.path);
      continue;
    }
    const safety = resolveWithin(plan.projectRoot, file.path);
    if (!safety.safe) {
      throw new Error(`Refusing to write outside the project: ${file.path}`);
    }
    fs.mkdirSync(path.dirname(safety.resolved), { recursive: true });
    fs.writeFileSync(safety.resolved, file.contents, 'utf8');
    written.push(file.path);
  }

  return { written, skipped };
}

/** Default downloader. Kept injectable so tests never touch the network. */
export async function downloadFile(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/** SHA-256 helper re-exported so callers do not need a second import. */
export { sha256 };
