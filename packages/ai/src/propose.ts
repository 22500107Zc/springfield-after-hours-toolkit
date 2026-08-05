import { MissionSchema, type Mission } from '@sah/schemas';
import { resolveRecord, type RegistrySet } from '@sah/registry';
import type { z } from 'zod';

/**
 * The propose → parse → validate pipeline.
 *
 * The flow is deliberately rigid, because the whole risk of adding a language
 * model to a toolkit like this is that it confidently invents a locator name:
 *
 *   1. the model returns structured JSON
 *   2. it is parsed against the schema        <- rejects malformed output
 *   3. every reference is resolved            <- rejects invented game content
 *   4. the diff is shown to the user
 *   5. the user confirms
 *   6. validation runs again
 *
 * Steps 2 and 3 happen here. Nothing in this module writes to disk.
 */

export interface ProposalRejection {
  stage: 'parse' | 'references';
  message: string;
  details: string[];
}

export type ProposalResult<T> =
  | { accepted: true; value: T; warnings: string[] }
  | { accepted: false; rejection: ProposalRejection };

/** Extracts JSON from a model response, tolerating fenced code blocks. */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();

  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(trimmed);
  const candidate = fenced?.[1]?.trim() ?? trimmed;

  return JSON.parse(candidate);
}

export function parseProposal<T>(raw: string, schema: z.ZodType<T>): ProposalResult<T> {
  let json: unknown;
  try {
    json = extractJson(raw);
  } catch (error) {
    return {
      accepted: false,
      rejection: {
        stage: 'parse',
        message: 'The model did not return valid JSON.',
        details: [(error as Error).message],
      },
    };
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return {
      accepted: false,
      rejection: {
        stage: 'parse',
        message: 'The model returned JSON that does not match the schema.',
        details: parsed.error.issues.map(
          (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
        ),
      },
    };
  }

  return { accepted: true, value: parsed.data, warnings: [] };
}

/**
 * Rejects a proposed mission that references game content the registries
 * cannot confirm.
 *
 * This is the step that stops a plausible-sounding hallucination — "the
 * `java_server_front` locator" — from ever reaching a file.
 */
export function checkProposedMissionReferences(
  mission: Mission,
  registries: RegistrySet,
): ProposalResult<Mission> {
  const problems: string[] = [];

  const check = (
    kind: Parameters<typeof resolveRecord>[1],
    value: unknown,
    label: string,
  ): void => {
    if (value === undefined || value === null) return;
    const id = typeof value === 'string' ? value : (value as { ref?: string }).ref;
    if (!id) return;
    if (!resolveRecord(registries, kind, id).record) {
      problems.push(`${label} "${id}" does not exist in the ${kind} registry`);
    }
  };

  check('levels', mission.level, 'level');
  check('characters', mission.player, 'player character');
  check('vehicles', mission.startingVehicle, 'starting vehicle');
  check('locators', mission.resetPlayerInCarLocator, 'reset locator');

  for (const hack of mission.requiredHacks) check('hacks', hack, 'required hack');

  mission.stages.forEach((stage, index) => {
    const where = `stage[${index}] "${stage.id}"`;
    check('hud-icons', stage.hudIcon, `${where} HUD icon`);

    const objective = stage.objective as { type: string } & Record<string, unknown>;
    check(
      'objectives',
      objective.type === 'raw' ? objective['objective'] : objective.type,
      `${where} objective`,
    );
    check('locators', objective['destination'], `${where} destination`);
    check('locators', objective['locator'], `${where} locator`);
    check('characters', objective['character'], `${where} character`);
    check('vehicles', objective['vehicle'], `${where} vehicle`);

    for (const condition of stage.conditions) {
      check('conditions', condition.type, `${where} condition`);
    }
    for (const raw of stage.rawCommands) {
      check('commands', raw.command, `${where} raw command`);
    }
  });

  if (problems.length > 0) {
    return {
      accepted: false,
      rejection: {
        stage: 'references',
        message:
          'The proposal referenced game content that is not in the verified registries. It was rejected and nothing was written.',
        details: problems,
      },
    };
  }

  return { accepted: true, value: mission, warnings: [] };
}

/** Schema the model is asked to conform to for `sah ai scaffold-mission`. */
export const ProposedMissionSchema = MissionSchema;
