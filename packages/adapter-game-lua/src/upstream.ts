import fs from 'node:fs';
import path from 'node:path';
import { findUpwards, moduleDirectory } from '@sah/core';

/**
 * Information about the pinned upstream Game.lua.
 *
 * This toolkit does NOT vendor Game.lua. It generates scripts that call into
 * it, and reports honestly whether the library is present so a build never
 * silently produces a mod that cannot run.
 */

export interface UpstreamFile {
  path: string;
  sha256?: string;
  bytes?: number;
  installTo?: string;
  required: boolean;
}

export interface UpstreamDependency {
  repository: string;
  url: string;
  commit: string;
  license: string;
  copyright?: string;
  role: string;
  description: string;
  vendorPath?: string;
  files: UpstreamFile[];
}

export interface UpstreamLock {
  version: 1;
  derivedAt: string;
  dependencies: Record<string, UpstreamDependency>;
}

let cached: UpstreamLock | undefined;

export function loadUpstreamLock(): UpstreamLock {
  if (cached) return cached;
  const start = moduleDirectory(import.meta.url);
  const root = findUpwards(start, path.join('data', 'upstream', 'upstream.lock.json'));
  if (!root) {
    throw new Error('Could not locate data/upstream/upstream.lock.json.');
  }
  const file = path.join(root, 'data', 'upstream', 'upstream.lock.json');
  cached = JSON.parse(fs.readFileSync(file, 'utf8')) as UpstreamLock;
  return cached;
}

export function gameLuaDependency(): UpstreamDependency {
  const lock = loadUpstreamLock();
  const dependency = lock.dependencies['donutteam/game-lua'];
  if (!dependency) throw new Error('upstream.lock.json is missing donutteam/game-lua.');
  return dependency;
}

export interface GameLuaAvailability {
  available: boolean;
  /** Absolute path to the vendored copy, when present. */
  vendorPath?: string;
  commit: string;
  message: string;
}

/**
 * Reports whether the pinned Game.lua has been fetched into `vendor/`.
 *
 * A build proceeds without it — the generated scripts are still correct — but
 * the manifest records that the mod is incomplete until the user fetches it.
 */
export function checkGameLuaAvailability(): GameLuaAvailability {
  const dependency = gameLuaDependency();
  const start = moduleDirectory(import.meta.url);
  const root = findUpwards(start, path.join('data', 'upstream', 'upstream.lock.json'));

  if (!root || !dependency.vendorPath) {
    return {
      available: false,
      commit: dependency.commit,
      message: 'Could not determine the vendor directory for Game.lua.',
    };
  }

  const vendored = path.join(root, dependency.vendorPath, 'src', 'Game.lua');
  if (fs.existsSync(vendored)) {
    return {
      available: true,
      vendorPath: vendored,
      commit: dependency.commit,
      message: `Game.lua present (pinned to ${dependency.commit.slice(0, 12)}).`,
    };
  }

  return {
    available: false,
    commit: dependency.commit,
    message:
      'Game.lua has not been fetched. Generated mission scripts will not run until it is installed in the mod. Run "npm run upstream:fetch".',
  };
}
