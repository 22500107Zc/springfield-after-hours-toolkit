import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { campaignSchema, type Campaign } from '@sah/schemas';
import type { Registry } from '@sah/registry';

export type Diagnostic = {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
};
export type ValidationResult = { valid: boolean; diagnostics: Diagnostic[]; campaign?: Campaign };

export function validateCampaign(input: unknown, registry: Registry): ValidationResult {
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success)
    return {
      valid: false,
      diagnostics: parsed.error.issues.map((issue) => ({
        severity: 'error',
        code: 'SCHEMA',
        message: issue.message,
        path: issue.path.join('.'),
      })),
    };
  const diagnostics: Diagnostic[] = [];
  const missionIds = new Set<string>();
  const dialogueIds = new Set(parsed.data.dialogue.map((item) => item.id));
  for (const mission of parsed.data.missions) {
    if (missionIds.has(mission.id))
      diagnostics.push({
        severity: 'error',
        code: 'DUPLICATE_MISSION',
        message: `Duplicate mission: ${mission.id}`,
      });
    missionIds.add(mission.id);
    if (mission.player && !registry.get('character', mission.player))
      diagnostics.push({
        severity: 'error',
        code: 'UNKNOWN_CHARACTER',
        message: `Unknown character: ${mission.player}`,
      });
    if (mission.startingVehicle && !registry.get('vehicle', mission.startingVehicle))
      diagnostics.push({
        severity: 'error',
        code: 'UNKNOWN_VEHICLE',
        message: `Unknown vehicle: ${mission.startingVehicle}`,
      });
    const stageIds = new Set<string>();
    for (const stage of mission.stages) {
      if (stageIds.has(stage.id))
        diagnostics.push({
          severity: 'error',
          code: 'DUPLICATE_STAGE',
          message: `Duplicate stage ${stage.id} in ${mission.id}`,
        });
      stageIds.add(stage.id);
      const capability = registry.get('objective', stage.objective.type);
      if (
        !capability ||
        ['unsupported', 'planned', 'unverified'].includes(capability.provenance.verificationStatus)
      )
        diagnostics.push({
          severity: 'error',
          code: 'UNSUPPORTED_OBJECTIVE',
          message: `Objective ${stage.objective.type} is not build-supported`,
        });
      if (stage.objective.type === 'goto' && !registry.get('locator', stage.objective.destination))
        diagnostics.push({
          severity: 'error',
          code: 'UNKNOWN_LOCATOR',
          message: `Unknown locator: ${stage.objective.destination}`,
        });
      if (stage.objective.type === 'dialogue' && !dialogueIds.has(stage.objective.conversation))
        diagnostics.push({
          severity: 'error',
          code: 'UNKNOWN_DIALOGUE',
          message: `Unknown dialogue: ${stage.objective.conversation}`,
        });
    }
  }
  for (const dialogue of parsed.data.dialogue)
    for (const line of dialogue.lines) {
      if (!registry.get('character', line.speaker))
        diagnostics.push({
          severity: 'error',
          code: 'UNKNOWN_SPEAKER',
          message: `Unknown speaker: ${line.speaker}`,
        });
      if (!line.audio && !dialogue.textOnlyFallback)
        diagnostics.push({
          severity: 'warning',
          code: 'MISSING_AUDIO',
          message: `Dialogue ${dialogue.id} has no audio fallback`,
        });
    }
  return {
    valid: !diagnostics.some((item) => item.severity === 'error'),
    diagnostics,
    campaign: parsed.data,
  };
}

export async function validateCampaignFile(
  path: string,
  registry: Registry,
): Promise<ValidationResult> {
  return validateCampaign(parse(await readFile(path, 'utf8')) as unknown, registry);
}
