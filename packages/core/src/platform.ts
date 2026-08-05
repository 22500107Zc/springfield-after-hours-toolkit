import os from 'node:os';
import process from 'node:process';

/**
 * Platform reporting.
 *
 * The toolkit authors and builds campaigns on any platform. Actually *launching*
 * the game is a different matter, and this module refuses to pretend otherwise.
 */

export type HostPlatform = 'windows' | 'macos' | 'linux' | 'other';

export interface PlatformReport {
  platform: HostPlatform;
  osRelease: string;
  arch: string;
  nodeVersion: string;
  /** Whether the game can be launched natively on this host. */
  canLaunchGameNatively: boolean;
  /** Honest explanation of what is and is not possible here. */
  launchNotes: string[];
}

export function detectPlatform(): HostPlatform {
  switch (process.platform) {
    case 'win32':
      return 'windows';
    case 'darwin':
      return 'macos';
    case 'linux':
      return 'linux';
    default:
      return 'other';
  }
}

export function describePlatform(): PlatformReport {
  const platform = detectPlatform();
  const notes: string[] = [];
  let canLaunch = false;

  switch (platform) {
    case 'windows':
      canLaunch = true;
      notes.push(
        'Lucas’ Simpsons: Hit & Run Mod Launcher is a Windows application; launching is supported on this host.',
      );
      break;
    case 'linux':
      notes.push(
        'The Mod Launcher is a Windows application. Launching from Linux requires Wine or Proton and is not managed by this toolkit.',
      );
      notes.push('Authoring, validating, building and packaging all work natively here.');
      break;
    case 'macos':
      notes.push(
        'The Mod Launcher is a Windows application. macOS cannot launch it natively; a Windows VM or a Wine-based runtime is required.',
      );
      notes.push('Authoring, validating, building and packaging all work natively here.');
      break;
    default:
      notes.push(`Unrecognised platform "${process.platform}". Launch support is unknown.`);
      break;
  }

  return {
    platform,
    osRelease: `${os.type()} ${os.release()}`,
    arch: process.arch,
    nodeVersion: process.version,
    canLaunchGameNatively: canLaunch,
    launchNotes: notes,
  };
}

/**
 * Reports whether an API key is present WITHOUT revealing any part of it.
 * Nothing in this toolkit ever prints, logs or returns the key itself.
 */
export function hasAnthropicApiKey(env: NodeJS.ProcessEnv = process.env): boolean {
  const value = env['ANTHROPIC_API_KEY'];
  return typeof value === 'string' && value.trim().length > 0;
}
