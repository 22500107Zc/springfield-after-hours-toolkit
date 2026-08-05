import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { parse as parseYaml } from 'yaml';

/**
 * Toolkit configuration.
 *
 * Precedence, highest wins:
 *   1. command-line arguments
 *   2. environment variables
 *   3. campaign-local config   (<campaign>/sah.config.json|yaml, sah.local.json)
 *   4. user-global config      (~/.config/sah/config.json)
 *   5. built-in defaults
 *
 * The Anthropic API key is deliberately NOT part of this structure. It is read
 * from the environment only, so it cannot end up in a committed config file.
 */

export interface SahConfig {
  /** Path to the user's game installation. Read-only to this toolkit. */
  gamePath?: string;
  /** Path to Lucas' Simpsons: Hit & Run Mod Launcher. */
  modLauncherPath?: string;
  /** Directory the Mod Launcher loads mods from. */
  modsDirectory?: string;
  /** Path to a user-installed connected-map mod, if any. */
  connectedMapPath?: string;
  /** Where `sah build` writes. Relative paths resolve against the campaign root. */
  buildDirectory: string;
  /** Default campaign file for commands run without an explicit path. */
  defaultCampaign?: string;
  /** Extra registry directories layered on top of the built-in registries. */
  registryDirectories: string[];
  /** Model used by the optional `sah ai` commands. */
  anthropicModel: string;
  /** Hard ceiling on output tokens for a single AI command. */
  aiMaxOutputTokens: number;
  /** Refuse an AI command whose estimated cost exceeds this, in USD. */
  aiMaxCostUsd: number;
  /** Command used to launch the game, when the platform supports it. */
  platformLaunchCommand?: string;
}

export const DEFAULT_CONFIG: SahConfig = {
  buildDirectory: 'build',
  registryDirectories: [],
  anthropicModel: 'claude-sonnet-5',
  aiMaxOutputTokens: 4096,
  aiMaxCostUsd: 0.5,
};

export interface ConfigLayer {
  /** Where this layer came from, for `sah config` output. */
  source: string;
  values: Partial<SahConfig>;
}

export interface ResolvedConfig {
  config: SahConfig;
  /** Layers in precedence order, lowest first. */
  layers: ConfigLayer[];
}

const CONFIG_FILENAMES = ['sah.config.json', 'sah.config.yaml', 'sah.config.yml'];
const LOCAL_CONFIG_FILENAMES = ['sah.local.json', 'sah.config.local.json'];

function readConfigFile(file: string): Partial<SahConfig> | undefined {
  if (!fs.existsSync(file)) return undefined;
  const text = fs.readFileSync(file, 'utf8');
  const parsed: unknown = file.endsWith('.json') ? JSON.parse(text) : parseYaml(text);
  if (parsed === null || typeof parsed !== 'object') {
    throw new Error(`Config file ${file} must contain an object.`);
  }
  return parsed as Partial<SahConfig>;
}

export function userConfigPath(homedir: string = os.homedir()): string {
  const xdg = process.env['XDG_CONFIG_HOME'];
  const base = xdg && xdg.length > 0 ? xdg : path.join(homedir, '.config');
  return path.join(base, 'sah', 'config.json');
}

function fromEnvironment(env: NodeJS.ProcessEnv): Partial<SahConfig> {
  const values: Partial<SahConfig> = {};
  const str = (key: string): string | undefined => {
    const v = env[key];
    return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
  };

  const gamePath = str('SAH_GAME_PATH');
  if (gamePath) values.gamePath = gamePath;
  const launcher = str('SAH_MOD_LAUNCHER_PATH');
  if (launcher) values.modLauncherPath = launcher;
  const mods = str('SAH_MODS_DIRECTORY');
  if (mods) values.modsDirectory = mods;
  const connected = str('SAH_CONNECTED_MAP_PATH');
  if (connected) values.connectedMapPath = connected;
  const buildDir = str('SAH_BUILD_DIRECTORY');
  if (buildDir) values.buildDirectory = buildDir;
  const model = str('SAH_ANTHROPIC_MODEL');
  if (model) values.anthropicModel = model;
  const registryDir = str('SAH_REGISTRY_DIR');
  if (registryDir) values.registryDirectories = registryDir.split(path.delimiter).filter(Boolean);

  const maxTokens = str('SAH_AI_MAX_OUTPUT_TOKENS');
  if (maxTokens && Number.isFinite(Number(maxTokens))) {
    values.aiMaxOutputTokens = Number(maxTokens);
  }
  const maxCost = str('SAH_AI_MAX_COST_USD');
  if (maxCost && Number.isFinite(Number(maxCost))) {
    values.aiMaxCostUsd = Number(maxCost);
  }

  return values;
}

export interface LoadConfigOptions {
  /** Campaign workspace root to look for campaign-local config in. */
  campaignRoot?: string;
  /** Values supplied on the command line. Highest precedence. */
  overrides?: Partial<SahConfig>;
  env?: NodeJS.ProcessEnv;
  homedir?: string;
}

export function loadConfig(options: LoadConfigOptions = {}): ResolvedConfig {
  const env = options.env ?? process.env;
  const layers: ConfigLayer[] = [{ source: 'defaults', values: DEFAULT_CONFIG }];

  const globalPath = userConfigPath(options.homedir);
  const globalValues = readConfigFile(globalPath);
  if (globalValues) layers.push({ source: globalPath, values: globalValues });

  if (options.campaignRoot) {
    for (const name of [...CONFIG_FILENAMES, ...LOCAL_CONFIG_FILENAMES]) {
      const file = path.join(options.campaignRoot, name);
      const values = readConfigFile(file);
      if (values) layers.push({ source: file, values });
    }
  }

  const envValues = fromEnvironment(env);
  if (Object.keys(envValues).length > 0) {
    layers.push({ source: 'environment', values: envValues });
  }

  if (options.overrides && Object.keys(options.overrides).length > 0) {
    layers.push({ source: 'command line', values: options.overrides });
  }

  const config = layers.reduce<SahConfig>(
    (acc, layer) => ({ ...acc, ...stripUndefined(layer.values) }),
    { ...DEFAULT_CONFIG },
  );

  return { config, layers };
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/**
 * Redacts anything that looks like a credential before config is printed or
 * returned over MCP. Defence in depth: keys should never be in config at all.
 */
export function redactConfig(config: SahConfig): SahConfig {
  const redacted: SahConfig = { ...config };
  for (const key of Object.keys(redacted) as Array<keyof SahConfig>) {
    if (/key|token|secret|password/i.test(key)) {
      (redacted as unknown as Record<string, unknown>)[key] = '[redacted]';
    }
  }
  return redacted;
}
