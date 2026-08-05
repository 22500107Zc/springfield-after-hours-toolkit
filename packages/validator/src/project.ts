import fs from 'node:fs';
import path from 'node:path';
import { DIAGNOSTIC_CODES, readDocument, resolveWithin, type Diagnostic } from '@sah/core';
import {
  CampaignFileSchema,
  DialogueFileSchema,
  MissionFileSchema,
  NightPresetFileSchema,
  type Campaign,
  type Conversation,
  type Mission,
  type NightPreset,
} from '@sah/schemas';
import type { z } from 'zod';

/**
 * A loaded campaign workspace.
 *
 * Loading is separate from validating: this module's job is to get documents
 * off disk safely and report what it could not read. Semantic checks live in
 * `validate.ts`.
 */
export interface CampaignProject {
  root: string;
  campaignFile: string;
  /**
   * Undefined when the campaign document itself could not be read or parsed.
   * Narrow with `projectLoaded` before using it.
   */
  campaign: Campaign | undefined;
  missions: LoadedMission[];
  conversations: LoadedConversation[];
  presets: LoadedPreset[];
  diagnostics: Diagnostic[];
}

/** A project whose campaign document loaded successfully. */
export type LoadedCampaignProject = CampaignProject & { campaign: Campaign };

export interface LoadedMission {
  mission: Mission;
  /** Path relative to the campaign root, forward slashes. */
  file: string;
}

export interface LoadedConversation {
  conversation: Conversation;
  file: string;
}

export interface LoadedPreset {
  preset: NightPreset;
  file: string;
}

const CAMPAIGN_FILENAMES = ['campaign.yaml', 'campaign.yml', 'campaign.json'];

/** Finds the campaign document for a directory, or accepts a direct file path. */
export function resolveCampaignFile(target: string): string | undefined {
  const absolute = path.resolve(target);
  if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) return absolute;
  for (const name of CAMPAIGN_FILENAMES) {
    const candidate = path.join(absolute, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ');
}

/**
 * Reads one referenced document, refusing any path that escapes the campaign
 * root. This is the same guard the MCP server relies on.
 */
function readReferenced<T>(
  root: string,
  relativePath: string,
  schema: z.ZodType<T>,
  pointer: string,
  diagnostics: Diagnostic[],
): { value: T; file: string } | undefined {
  const safety = resolveWithin(root, relativePath);
  if (!safety.safe) {
    diagnostics.push({
      code: DIAGNOSTIC_CODES.UNSAFE_OUTPUT_PATH,
      severity: 'error',
      message: `Refused to read "${relativePath}": ${safety.reason}.`,
      location: { file: 'campaign.yaml', pointer },
      hint: 'Referenced files must live inside the campaign directory.',
    });
    return undefined;
  }

  if (!fs.existsSync(safety.resolved)) {
    diagnostics.push({
      code: DIAGNOSTIC_CODES.DOCUMENT_UNREADABLE,
      severity: 'error',
      message: `Referenced file "${relativePath}" does not exist.`,
      location: { file: 'campaign.yaml', pointer },
    });
    return undefined;
  }

  let raw: unknown;
  try {
    raw = readDocument(safety.resolved);
  } catch (error) {
    diagnostics.push({
      code: DIAGNOSTIC_CODES.DOCUMENT_UNREADABLE,
      severity: 'error',
      message: `Could not parse "${relativePath}": ${(error as Error).message}`,
      location: { file: relativePath },
    });
    return undefined;
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    diagnostics.push({
      code: DIAGNOSTIC_CODES.SCHEMA_INVALID,
      severity: 'error',
      message: `"${relativePath}" does not match its schema: ${formatIssues(parsed.error)}`,
      location: { file: relativePath },
    });
    return undefined;
  }

  return { value: parsed.data, file: relativePath };
}

export function loadProject(target: string): CampaignProject {
  const diagnostics: Diagnostic[] = [];
  const campaignFile = resolveCampaignFile(target);

  if (!campaignFile) {
    diagnostics.push({
      code: DIAGNOSTIC_CODES.DOCUMENT_UNREADABLE,
      severity: 'error',
      message: `No campaign document found at "${target}".`,
      hint: `Expected one of ${CAMPAIGN_FILENAMES.join(', ')}, or a path to a campaign file. Run "sah init" to create one.`,
    });
    return emptyProject(path.resolve(target), '', diagnostics);
  }

  const root = path.dirname(campaignFile);

  let raw: unknown;
  try {
    raw = readDocument(campaignFile);
  } catch (error) {
    diagnostics.push({
      code: DIAGNOSTIC_CODES.DOCUMENT_UNREADABLE,
      severity: 'error',
      message: `Could not parse the campaign document: ${(error as Error).message}`,
      location: { file: path.basename(campaignFile) },
    });
    return emptyProject(root, campaignFile, diagnostics);
  }

  const parsed = CampaignFileSchema.safeParse(raw);
  if (!parsed.success) {
    diagnostics.push({
      code: DIAGNOSTIC_CODES.SCHEMA_INVALID,
      severity: 'error',
      message: `The campaign document does not match its schema: ${formatIssues(parsed.error)}`,
      location: { file: path.basename(campaignFile) },
    });
    return emptyProject(root, campaignFile, diagnostics);
  }

  const campaign = parsed.data.campaign;

  const missions: LoadedMission[] = [];
  campaign.missionFiles.forEach((relativePath, index) => {
    const loaded = readReferenced(
      root,
      relativePath,
      MissionFileSchema,
      `campaign.missionFiles[${index}]`,
      diagnostics,
    );
    if (loaded) missions.push({ mission: loaded.value.mission, file: loaded.file });
  });

  const conversations: LoadedConversation[] = [];
  campaign.dialogueFiles.forEach((relativePath, index) => {
    const loaded = readReferenced(
      root,
      relativePath,
      DialogueFileSchema,
      `campaign.dialogueFiles[${index}]`,
      diagnostics,
    );
    if (loaded) {
      for (const conversation of loaded.value.conversations) {
        conversations.push({ conversation, file: loaded.file });
      }
    }
  });

  const presets: LoadedPreset[] = [];
  campaign.presetFiles.forEach((relativePath, index) => {
    const loaded = readReferenced(
      root,
      relativePath,
      NightPresetFileSchema,
      `campaign.presetFiles[${index}]`,
      diagnostics,
    );
    if (loaded) presets.push({ preset: loaded.value.preset, file: loaded.file });
  });

  return { root, campaignFile, campaign, missions, conversations, presets, diagnostics };
}

function emptyProject(
  root: string,
  campaignFile: string,
  diagnostics: Diagnostic[],
): CampaignProject {
  return {
    root,
    campaignFile,
    campaign: undefined,
    missions: [],
    conversations: [],
    presets: [],
    diagnostics,
  };
}

/** True when loading produced a usable campaign document. */
export function projectLoaded(project: CampaignProject): project is LoadedCampaignProject {
  return project.campaign !== undefined;
}
