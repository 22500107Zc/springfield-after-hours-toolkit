import fs from 'node:fs';
import path from 'node:path';
import { findUpwards, loadConfig, moduleDirectory, type SahConfig } from '@sah/core';
import { loadRegistries, type RegistrySet } from '@sah/registry';

/** Reads the toolkit version from the repository's root package.json. */
export function toolkitVersion(): string {
  const root = findUpwards(moduleDirectory(import.meta.url), 'package.json');
  if (!root) return '0.0.0';
  // Walk to the workspace root, which is the package.json declaring workspaces.
  let current = root;
  for (;;) {
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(current, 'package.json'), 'utf8')) as {
        workspaces?: unknown;
        version?: string;
      };
      if (parsed.workspaces) return parsed.version ?? '0.0.0';
    } catch {
      // Fall through and keep walking; a missing package.json is not fatal here.
    }
    const parent = findUpwards(path.dirname(current), 'package.json');
    if (!parent || parent === current) return '0.1.0';
    current = parent;
  }
}

export interface CommandContext {
  config: SahConfig;
  configLayers: Array<{ source: string; values: Partial<SahConfig> }>;
  registries: RegistrySet;
  version: string;
}

export interface ContextOptions {
  campaignRoot?: string;
  registryDirectories?: string[];
}

export function createContext(options: ContextOptions = {}): CommandContext {
  const resolved = loadConfig(options.campaignRoot ? { campaignRoot: options.campaignRoot } : {});

  const extraDirectories = [
    ...resolved.config.registryDirectories,
    ...(options.registryDirectories ?? []),
  ];

  const registries = loadRegistries({ dataDirectories: extraDirectories });

  return {
    config: resolved.config,
    configLayers: resolved.layers,
    registries,
    version: toolkitVersion(),
  };
}
