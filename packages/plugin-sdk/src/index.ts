import type { Diagnostic, VerificationStatus } from '@sah/core';
import type { RegistryKind } from '@sah/schemas';

/**
 * The plugin contribution interface.
 *
 * ============================================================================
 * THERE IS NO LOADER HERE, AND THAT IS DELIBERATE.
 * ============================================================================
 *
 * A plugin system for this toolkit means running third-party code that can
 * contribute *game facts*. Getting that wrong would let a plugin inject
 * unverified registry records and defeat the one guarantee the toolkit makes.
 *
 * Rather than ship a loader that is not yet safe, this package defines the
 * typed contract and documents the security boundary that any future loader
 * must respect. See docs/architecture/plugins.md.
 *
 * Requirements a loader must satisfy before it is written:
 *
 *   1. Plugins are opt-in per project, named explicitly in configuration.
 *      Discovery by scanning node_modules is not acceptable.
 *   2. Registry records contributed by a plugin carry the plugin's identity in
 *      their provenance, and may not claim `verified` status.
 *   3. Plugin code does not run during `sah validate` or `sah build` unless the
 *      project has enabled that plugin.
 *   4. Plugins get no filesystem access outside the campaign workspace.
 *   5. A plugin cannot override a built-in registry record silently; a conflict
 *      is a diagnostic.
 */

export interface PluginMetadata {
  /** Stable plugin id, e.g. "acme-night-tools". */
  id: string;
  name: string;
  version: string;
  description: string;
  /** Where the plugin came from, for the build manifest. */
  homepage?: string;
  license?: string;
}

/**
 * A registry record contributed by a plugin.
 *
 * Note the absence of a `verificationStatus: 'verified'` option. A plugin can
 * report what it has observed; it cannot certify a game fact on the toolkit's
 * behalf.
 */
export interface PluginRegistryContribution {
  kind: RegistryKind;
  id: string;
  displayName: string;
  gameCode?: string;
  /** Plugins may not contribute `verified` records. */
  verificationStatus: Exclude<VerificationStatus, 'verified'>;
  /** Human-readable justification. Becomes provenance detail. */
  evidence: string;
  notes?: string[];
}

export interface PluginValidator {
  id: string;
  description: string;
  /** Returns diagnostics for a campaign. Must be pure and must not write files. */
  validate: (context: PluginValidationContext) => Diagnostic[];
}

export interface PluginValidationContext {
  /** Absolute path of the campaign workspace. Nothing outside it may be read. */
  campaignRoot: string;
  /** The parsed campaign document, as unknown — plugins parse what they need. */
  campaign: unknown;
  missions: readonly unknown[];
  conversations: readonly unknown[];
}

export interface PluginCliCommand {
  name: string;
  description: string;
  /** Returns an exit code. Must not call process.exit. */
  run: (args: readonly string[]) => number | Promise<number>;
}

export interface PluginMcpTool {
  name: string;
  description: string;
  /** JSON Schema for the tool's input. Validated before the handler runs. */
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => unknown;
}

/** The shape a plugin module's default export must have. */
export interface SahPlugin {
  metadata: PluginMetadata;
  registryContributions?: PluginRegistryContribution[];
  validators?: PluginValidator[];
  cliCommands?: PluginCliCommand[];
  mcpTools?: PluginMcpTool[];
}

/**
 * Structural check for a plugin object.
 *
 * Exported now so that a future loader, and anyone prototyping a plugin, share
 * one definition of "well formed" rather than diverging.
 */
export function isSahPlugin(value: unknown): value is SahPlugin {
  if (value === null || typeof value !== 'object') return false;
  const candidate = value as { metadata?: unknown };
  if (candidate.metadata === null || typeof candidate.metadata !== 'object') return false;
  const metadata = candidate.metadata as Partial<PluginMetadata>;
  return (
    typeof metadata.id === 'string' &&
    typeof metadata.name === 'string' &&
    typeof metadata.version === 'string' &&
    typeof metadata.description === 'string'
  );
}

/** Current status of the plugin system, reported by `sah doctor` and the docs. */
export const PLUGIN_SYSTEM_STATUS = {
  status: 'planned' as const,
  summary:
    'The plugin contract is defined and typed. No loader exists yet, so no third-party code is executed by the toolkit.',
  blockers: [
    'A sandbox for plugin validators that cannot read outside the campaign workspace.',
    'Provenance attribution so plugin-contributed records are always distinguishable from verified ones.',
    'A conflict policy for plugins that redefine built-in registry records.',
  ],
};
