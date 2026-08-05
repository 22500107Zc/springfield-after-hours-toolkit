import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  DIAGNOSTIC_CODES,
  DIAGNOSTIC_HELP,
  ProvenanceIndex,
  VERIFICATION_STATUSES,
  describePlatform,
  hasAnthropicApiKey,
  stableStringify,
} from '@sah/core';
import { REGISTRY_KINDS, type RegistryKind } from '@sah/schemas';
import {
  getRecord,
  listRecords,
  loadRegistries,
  registryCounts,
  searchRegistries,
  type RegistrySet,
} from '@sah/registry';
import { loadProject, projectLoaded, validateProject } from '@sah/validator';
import { buildCampaign } from '@sah/compiler';
import { checkGameLuaAvailability } from '@sah/adapter-game-lua';
import { resolveInSandbox, toWorkspaceRelative, type Sandbox } from './sandbox.js';

/**
 * MCP tool definitions.
 *
 * Design rules, in priority order:
 *   - No tool writes to the filesystem. Scaffolding tools RETURN file content
 *     and let Claude Code write it through its own reviewed edit flow, so a
 *     model cannot silently modify a repository through this server.
 *   - Every path is resolved through the sandbox.
 *   - No tool returns environment variables, and none returns the API key.
 *   - Outputs are structured, so diagnostics stay machine-readable.
 */

export interface ToolContext {
  sandbox: Sandbox;
  registries: RegistrySet;
  toolkitVersion: string;
}

export interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodRawShape;
  handler: (args: Record<string, unknown>, context: ToolContext) => unknown;
}

const RegistryKindEnum = z.enum(REGISTRY_KINDS);

/** Formats a tool result as pretty JSON text content. */
export function toolResult(value: unknown): { content: Array<{ type: 'text'; text: string }> } {
  return { content: [{ type: 'text' as const, text: stableStringify(value) }] };
}

export const TOOLS: ToolDefinition[] = [
  {
    name: 'search_registry',
    title: 'Search verified game-content registries',
    description:
      "Search the toolkit's registries of VERIFIED game content (characters, locators, levels, commands, objectives, conditions, hacks and more). Returns nothing when nothing is verified — that is a real answer meaning the toolkit has no evidence the thing exists, not a search failure. Always call this before referencing any game content.",
    inputSchema: {
      query: z.string().min(1).describe('Search terms, e.g. "Comic Book Guy" or "AddStage".'),
      kind: RegistryKindEnum.optional().describe('Restrict to one registry.'),
      status: z
        .array(z.enum(VERIFICATION_STATUSES))
        .optional()
        .describe('Restrict to these verification statuses.'),
      limit: z.number().int().min(1).max(100).default(20),
    },
    handler: (args, context) => {
      const query = String(args['query']);
      const kind = args['kind'] as RegistryKind | undefined;
      const statuses = args['status'] as (typeof VERIFICATION_STATUSES)[number][] | undefined;
      const limit = Number(args['limit'] ?? 20);

      const hits = searchRegistries(context.registries, query, {
        ...(kind ? { kind } : {}),
        ...(statuses ? { statuses } : {}),
        limit,
      });

      return {
        query,
        count: hits.length,
        results: hits.map((hit) => ({
          registry: hit.record.kind,
          id: hit.record.id,
          displayName: hit.record.displayName,
          gameCode: hit.record.gameCode ?? null,
          verificationStatus: hit.record.verificationStatus,
          matchedOn: hit.matchedOn,
          notes: hit.record.notes,
        })),
        guidance:
          hits.length === 0
            ? 'No verified record matched. Do NOT invent one. Report to the user that this content is not verified, and that a campaign referencing it will not build.'
            : 'Use the `id` field when writing campaign YAML, not the displayName.',
      };
    },
  },

  {
    name: 'get_registry_record',
    title: 'Get one registry record with full provenance',
    description:
      'Fetch a single registry record by kind and id, including its verification status and the sources that justify it.',
    inputSchema: {
      kind: RegistryKindEnum,
      id: z.string().min(1),
    },
    handler: (args, context) => {
      const kind = args['kind'] as RegistryKind;
      const id = String(args['id']);
      const record = getRecord(context.registries, kind, id);

      if (!record) {
        return {
          found: false,
          kind,
          id,
          guidance:
            'This record does not exist. Do not treat its absence as permission to invent it.',
        };
      }

      const { resolved } = context.registries.provenance.resolve(record.provenance);
      return {
        found: true,
        record: { ...record, sourceFile: undefined },
        provenance: {
          detail: record.provenance.detail ?? null,
          sources: resolved.map((source) => ({
            id: source.id,
            type: source.type,
            title: source.title,
            url: source.url ?? null,
            commit: source.commit ?? null,
            citation: ProvenanceIndex.cite(source),
          })),
        },
      };
    },
  },

  {
    name: 'list_supported_objectives',
    title: 'List objective types and whether they can be generated',
    description:
      'List every known mission objective, with a `compilerSupport` field stating whether the toolkit can actually generate it. "supported" objectives compile; "partial" and "unsupported" ones are refused with an explanation.',
    inputSchema: {},
    handler: (_args, context) => {
      const records = listRecords(context.registries, 'objectives');
      return {
        count: records.length,
        objectives: records.map((record) => ({
          id: record.id,
          gameCode: record.gameCode,
          providedBy: record['providedBy'],
          verificationStatus: record.verificationStatus,
          compilerSupport: record['compilerSupport'],
          notes: record.notes,
        })),
        guidance:
          'Only objectives with compilerSupport "supported" can be used directly. Others require verified raw Game.* calls with allowRawGameCommands: true on the mission.',
      };
    },
  },

  {
    name: 'get_capability_status',
    title: 'Check whether a capability is actually supported',
    description:
      'Ask whether a proposed feature is supported, planned, experimental or impossible. Use this before telling a user that something is achievable — especially for open-world-style features such as weather, day/night cycles or dynamic NPC schedules, which this game does not have.',
    inputSchema: {
      capability: z
        .string()
        .min(1)
        .describe('The capability to look up, e.g. "dynamic weather" or "traffic density".'),
    },
    handler: (args, context) => {
      const query = String(args['capability']);
      const hits = searchRegistries(context.registries, query, {
        kind: 'preset-capabilities',
        limit: 10,
      });

      return {
        query,
        matches: hits.map((hit) => ({
          id: hit.record.id,
          displayName: hit.record.displayName,
          status: hit.record.verificationStatus,
          mechanism: hit.record['mechanism'] ?? null,
          notes: hit.record.notes,
        })),
        guidance:
          hits.length === 0
            ? 'No capability record matched. Treat the capability as UNVERIFIED and say so, rather than assuming it works.'
            : 'A status of "unsupported" means the game cannot do this. Do not propose it.',
      };
    },
  },

  {
    name: 'validate_campaign',
    title: 'Validate a campaign',
    description:
      'Run full validation on a campaign directory inside the workspace. Returns structured diagnostics with codes, locations and hints.',
    inputSchema: {
      path: z.string().default('.').describe('Campaign directory, relative to the workspace root.'),
    },
    handler: (args, context) => {
      const relative = String(args['path'] ?? '.');
      const target =
        relative === '.' ? context.sandbox.root : resolveInSandbox(context.sandbox, relative);
      const project = loadProject(target);

      if (!projectLoaded(project)) {
        return {
          ok: false,
          path: relative,
          diagnostics: project.diagnostics,
          guidance: 'No campaign document was found at this path.',
        };
      }

      const result = validateProject(project, context.registries);
      return {
        ok: result.ok,
        path: relative,
        campaign: { id: project.campaign.id, title: project.campaign.title },
        counts: {
          missions: project.missions.length,
          conversations: project.conversations.length,
          presets: project.presets.length,
        },
        summary: result.summary,
        diagnostics: result.diagnostics,
        acceptedRisks: result.acceptedRisks,
        guidance: result.ok
          ? 'Validation passed. Warnings do not block a build.'
          : 'Validation failed. Call explain_diagnostic with a code for detail. Do NOT work around an unresolved reference by inventing registry data.',
      };
    },
  },

  {
    name: 'validate_mission',
    title: 'Validate a single mission file',
    description:
      'Validate one mission file in isolation by loading its campaign and filtering diagnostics to that file.',
    inputSchema: {
      campaignPath: z.string().default('.'),
      missionFile: z.string().min(1).describe('Mission file path, relative to the campaign root.'),
    },
    handler: (args, context) => {
      const campaignRelative = String(args['campaignPath'] ?? '.');
      const missionFile = String(args['missionFile']);
      const target =
        campaignRelative === '.'
          ? context.sandbox.root
          : resolveInSandbox(context.sandbox, campaignRelative);

      const project = loadProject(target);
      if (!projectLoaded(project)) {
        return { ok: false, diagnostics: project.diagnostics };
      }

      const known = project.missions.map((m) => m.file);
      if (!known.includes(missionFile)) {
        return {
          ok: false,
          missionFile,
          knownMissionFiles: known,
          guidance: `"${missionFile}" is not listed in campaign.missionFiles.`,
        };
      }

      const result = validateProject(project, context.registries);
      const diagnostics = result.diagnostics.filter((d) => d.location?.file === missionFile);
      return {
        ok: !diagnostics.some((d) => d.severity === 'error'),
        missionFile,
        diagnostics,
        note: 'Campaign-wide problems are excluded here. Use validate_campaign for the whole picture.',
      };
    },
  },

  {
    name: 'compile_campaign',
    title: 'Compile a campaign (dry run by default)',
    description:
      'Validate and compile a campaign. Defaults to a dry run that writes nothing and returns the generated file list. Set dryRun to false to write output into the campaign build directory.',
    inputSchema: {
      path: z.string().default('.'),
      dryRun: z
        .boolean()
        .default(true)
        .describe('When true (the default), nothing is written to disk.'),
    },
    handler: (args, context) => {
      const relative = String(args['path'] ?? '.');
      const dryRun = args['dryRun'] !== false;
      const target =
        relative === '.' ? context.sandbox.root : resolveInSandbox(context.sandbox, relative);

      const project = loadProject(target);
      if (!projectLoaded(project)) {
        return { ok: false, diagnostics: project.diagnostics };
      }

      const outputDirectory = path.join(project.root, 'build');
      // Confirm the output stays inside the sandbox even in write mode.
      resolveInSandbox(context.sandbox, toWorkspaceRelative(context.sandbox, outputDirectory));

      const result = buildCampaign(project, context.registries, {
        outputDirectory,
        dryRun,
        toolkitVersion: context.toolkitVersion,
      });

      return {
        ok: result.ok,
        dryRun,
        outputDirectory: toWorkspaceRelative(context.sandbox, outputDirectory),
        files: result.files.map((f) => ({ path: f.path, generatedFrom: f.generatedFrom })),
        diagnostics: result.diagnostics,
        manifest: result.manifest ?? null,
        guidance: result.ok
          ? 'Compilation succeeded. A successful build means the scripts are internally consistent, NOT that the campaign has been tested in the game.'
          : 'Compilation was refused because validation failed. Nothing was written.',
      };
    },
  },

  {
    name: 'preview_generated_files',
    title: 'Preview generated file contents',
    description:
      'Return the full contents of the files a build would generate, without writing anything. Use this to review generated Lua and INI output before committing to a build.',
    inputSchema: {
      path: z.string().default('.'),
      file: z.string().optional().describe('Return only this generated file, e.g. "Meta.ini".'),
    },
    handler: (args, context) => {
      const relative = String(args['path'] ?? '.');
      const wanted = args['file'] as string | undefined;
      const target =
        relative === '.' ? context.sandbox.root : resolveInSandbox(context.sandbox, relative);

      const project = loadProject(target);
      if (!projectLoaded(project)) {
        return { ok: false, diagnostics: project.diagnostics };
      }

      const result = buildCampaign(project, context.registries, {
        outputDirectory: path.join(project.root, 'build'),
        dryRun: true,
        toolkitVersion: context.toolkitVersion,
      });

      if (!result.ok) {
        return {
          ok: false,
          diagnostics: result.diagnostics,
          guidance: 'Nothing can be previewed until validation passes.',
        };
      }

      const files = wanted ? result.files.filter((f) => f.path === wanted) : result.files;
      if (wanted && files.length === 0) {
        return {
          ok: false,
          requested: wanted,
          available: result.files.map((f) => f.path),
        };
      }

      return {
        ok: true,
        files: files.map((f) => ({
          path: f.path,
          generatedFrom: f.generatedFrom,
          contents: f.contents,
        })),
      };
    },
  },

  {
    name: 'explain_diagnostic',
    title: 'Explain a diagnostic code',
    description:
      'Explain what a diagnostic code means, how to fix it, and why the toolkit treats it that way.',
    inputSchema: {
      code: z.string().min(1).describe('Diagnostic code, e.g. "SAH2001".'),
    },
    handler: (args) => {
      const code = String(args['code']).toUpperCase();
      const help = DIAGNOSTIC_HELP[code];
      if (!help) {
        return {
          found: false,
          code,
          knownCodes: Object.keys(DIAGNOSTIC_HELP).sort(),
        };
      }
      return { found: true, code, ...help };
    },
  },

  {
    name: 'create_mission_scaffold',
    title: 'Generate mission YAML (returned, not written)',
    description:
      'Return YAML for a new mission. This tool does NOT write to disk — review the content and write it with your normal file-editing flow so the change is visible to the user.',
    inputSchema: {
      id: z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be lower-kebab-case')
        .describe('Mission id.'),
      title: z.string().min(1),
      level: z.string().default('level01').describe('Level registry id.'),
      gameMissionName: z.string().default('m0'),
    },
    handler: (args, context) => {
      const id = String(args['id']);
      const title = String(args['title']);
      const level = String(args['level'] ?? 'level01');
      const gameMissionName = String(args['gameMissionName'] ?? 'm0');

      const levelRecord = getRecord(context.registries, 'levels', level);
      const warnings: string[] = [];
      if (!levelRecord) {
        warnings.push(
          `Level "${level}" is not in the registry, so this mission will fail validation until it is.`,
        );
      }

      const yaml = `version: 1

mission:
  id: ${id}
  title: ${title}
  gameMissionName: ${gameMissionName}
  level: ${level}
  resetPlayerInCarLocator: level1-carstart
  status: planned

  stages:
    - id: ${id}-stage-1
      title: First stage
      resetToHere: true
      objective:
        type: dummy
`;

      return {
        suggestedPath: `missions/${id}.yaml`,
        contents: yaml,
        warnings,
        nextSteps: [
          `Write the content to missions/${id}.yaml.`,
          `Add "missions/${id}.yaml" to campaign.missionFiles in campaign.yaml.`,
          'Run validate_campaign.',
        ],
        guidance:
          'The objective is "dummy" because that is the only objective the toolkit can generate with no unverified parameters. Do not replace it with another objective type unless search_registry shows compilerSupport "supported".',
      };
    },
  },

  {
    name: 'create_dialogue_scaffold',
    title: 'Generate dialogue YAML (returned, not written)',
    description:
      'Return YAML for a new conversation, with every speaker checked against the character registry. Does NOT write to disk.',
    inputSchema: {
      id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be lower-kebab-case'),
      title: z.string().min(1),
      lines: z
        .array(
          z.object({
            speaker: z.string().min(1).describe('Character registry id, e.g. "bart".'),
            text: z.string().min(1),
          }),
        )
        .min(1),
    },
    handler: (args, context) => {
      const id = String(args['id']);
      const title = String(args['title']);
      const lines = args['lines'] as Array<{ speaker: string; text: string }>;

      const unresolved = lines
        .map((line) => line.speaker)
        .filter((speaker) => !getRecord(context.registries, 'characters', speaker));

      if (unresolved.length > 0) {
        return {
          ok: false,
          unresolvedSpeakers: [...new Set(unresolved)],
          guidance:
            'These speakers are not in the character registry, so the conversation would fail validation. Call search_registry with kind "characters" to find the correct ids. Do not invent a character code.',
        };
      }

      const body = lines
        .map(
          (line, index) =>
            `      - id: ${id}-line-${index + 1}\n        order: ${index + 1}\n        speaker: ${
              line.speaker
            }\n        text: ${JSON.stringify(line.text)}`,
        )
        .join('\n');

      return {
        ok: true,
        suggestedPath: `dialogue/${id}.yaml`,
        contents: `version: 1

conversations:
  - id: ${id}
    title: ${title}
    status: planned
    lines:
${body}
`,
        nextSteps: [
          `Write the content to dialogue/${id}.yaml.`,
          `Add "dialogue/${id}.yaml" to campaign.dialogueFiles.`,
          'Run validate_campaign.',
        ],
      };
    },
  },

  {
    name: 'run_toolkit_doctor',
    title: 'Report toolkit environment status',
    description:
      'Report the toolkit environment: platform, registry health, upstream dependency status, and whether an Anthropic API key is present. Never returns environment variable values.',
    inputSchema: {},
    handler: (_args, context) => {
      const platform = describePlatform();
      const counts = registryCounts(context.registries);
      const gameLua = checkGameLuaAvailability();

      return {
        toolkitVersion: context.toolkitVersion,
        workspace: context.sandbox.root,
        platform: {
          platform: platform.platform,
          nodeVersion: platform.nodeVersion,
          canLaunchGameNatively: platform.canLaunchGameNatively,
          launchNotes: platform.launchNotes,
        },
        registries: {
          counts,
          errors: context.registries.diagnostics.filter((d) => d.severity === 'error').length,
          emptyRegistries: Object.entries(counts)
            .filter(([, n]) => n === 0)
            .map(([kind]) => kind),
        },
        upstream: { gameLua: { installed: gameLua.available, commit: gameLua.commit } },
        // Presence only. The value is never read or returned.
        anthropicApiKeyPresent: hasAnthropicApiKey(),
      };
    },
  },
];

/** Builds a fresh tool context, reloading registries so edits are picked up. */
export function createToolContext(sandbox: Sandbox, toolkitVersion: string): ToolContext {
  return { sandbox, registries: loadRegistries(), toolkitVersion };
}

/** Used by tests to confirm a workspace-relative path is readable. */
export function readWorkspaceFile(sandbox: Sandbox, relativePath: string): string {
  const resolved = resolveInSandbox(sandbox, relativePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`${DIAGNOSTIC_CODES.DOCUMENT_UNREADABLE}: ${relativePath} does not exist.`);
  }
  return fs.readFileSync(resolved, 'utf8');
}
