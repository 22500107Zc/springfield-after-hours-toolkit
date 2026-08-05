import {
  DIAGNOSTIC_CODES,
  DiagnosticBag,
  findCaseCollisions,
  inspectGamePath,
  isBuildable,
  type Diagnostic,
} from '@sah/core';
import { referenceAllowsUnverified, referenceId, referenceReason } from '@sah/schemas';
import type { Campaign, Reference, RegistryKind } from '@sah/schemas';
import { resolveRecord, type LoadedRecord, type RegistrySet } from '@sah/registry';
import type { CampaignProject } from './project.js';

export interface ValidationResult {
  ok: boolean;
  diagnostics: Diagnostic[];
  summary: { errors: number; warnings: number; infos: number };
  /** References the author explicitly opted into despite weak verification. */
  acceptedRisks: AcceptedRisk[];
}

export interface AcceptedRisk {
  reference: string;
  registry: RegistryKind;
  status: string;
  reason: string;
  location: string;
}

interface ReferenceCheck {
  reference: Reference;
  kind: RegistryKind;
  pointer: string;
  file: string;
  /** Diagnostic code to use when the reference does not resolve at all. */
  unresolvedCode: Diagnostic['code'];
  /** When false, a missing reference is a warning rather than an error. */
  required?: boolean;
}

/** Diagnostic code to report for each registry kind's unresolved references. */
const UNRESOLVED_CODES: Partial<Record<RegistryKind, Diagnostic['code']>> = {
  locations: DIAGNOSTIC_CODES.UNRESOLVED_LOCATION,
  locators: DIAGNOSTIC_CODES.UNRESOLVED_LOCATOR,
  characters: DIAGNOSTIC_CODES.UNRESOLVED_CHARACTER,
  vehicles: DIAGNOSTIC_CODES.UNRESOLVED_VEHICLE,
  levels: DIAGNOSTIC_CODES.UNRESOLVED_LEVEL,
  'hud-icons': DIAGNOSTIC_CODES.UNRESOLVED_HUD_ICON,
};

export function validateProject(
  project: CampaignProject,
  registries: RegistrySet,
): ValidationResult {
  const bag = new DiagnosticBag();
  const acceptedRisks: AcceptedRisk[] = [];

  bag.extend(project.diagnostics);

  if (!project.campaign) {
    return finish(bag, acceptedRisks);
  }

  const { campaign } = project;
  const campaignFileName = project.campaignFile.split(/[\\/]/).pop() ?? 'campaign.yaml';

  // --- Registry load problems are the author's problem too --------------------
  bag.extend(registries.diagnostics);

  // --- Campaign-level structure ----------------------------------------------
  if (project.missions.length === 0) {
    bag.warn(DIAGNOSTIC_CODES.EMPTY_CAMPAIGN, `Campaign "${campaign.id}" declares no missions.`, {
      location: { file: campaignFileName, pointer: 'campaign.missionFiles' },
      hint: 'Add a mission file with "sah mission new", or accept that this campaign builds an empty mod.',
    });
  }

  const checks: ReferenceCheck[] = [];

  // --- Duplicate ids ----------------------------------------------------------
  assertUniqueIds(
    bag,
    project.missions.map((m) => ({ id: m.mission.id, file: m.file, pointer: 'mission.id' })),
    'mission',
  );
  assertUniqueIds(
    bag,
    project.conversations.map((c) => ({
      id: c.conversation.id,
      file: c.file,
      pointer: `conversations[${c.conversation.id}].id`,
    })),
    'conversation',
  );
  assertUniqueIds(
    bag,
    project.presets.map((p) => ({ id: p.preset.id, file: p.file, pointer: 'preset.id' })),
    'night preset',
  );

  const conversationIds = new Set(project.conversations.map((c) => c.conversation.id));
  const presetIds = new Set(project.presets.map((p) => p.preset.id));

  if (campaign.defaultPreset && !presetIds.has(campaign.defaultPreset)) {
    bag.error(
      DIAGNOSTIC_CODES.UNRESOLVED_PRESET,
      `Campaign default preset "${campaign.defaultPreset}" is not defined by any preset file.`,
      {
        location: { file: campaignFileName, pointer: 'campaign.defaultPreset' },
        reference: campaign.defaultPreset,
        hint: 'Add the preset to presetFiles, or remove defaultPreset.',
      },
    );
  }

  // --- Campaign-level hacks ---------------------------------------------------
  campaign.requiredHacks.forEach((hack, index) => {
    checks.push({
      reference: hack,
      kind: 'hacks',
      pointer: `campaign.requiredHacks[${index}]`,
      file: campaignFileName,
      unresolvedCode: DIAGNOSTIC_CODES.MISSING_REQUIRED_HACK,
    });
  });

  // --- Missions ---------------------------------------------------------------
  for (const { mission, file } of project.missions) {
    checks.push({
      reference: mission.level,
      kind: 'levels',
      pointer: 'mission.level',
      file,
      unresolvedCode: DIAGNOSTIC_CODES.UNRESOLVED_LEVEL,
    });

    if (mission.player) {
      checks.push({
        reference: mission.player,
        kind: 'characters',
        pointer: 'mission.player',
        file,
        unresolvedCode: DIAGNOSTIC_CODES.UNRESOLVED_CHARACTER,
      });
    }
    if (mission.startingVehicle) {
      checks.push({
        reference: mission.startingVehicle,
        kind: 'vehicles',
        pointer: 'mission.startingVehicle',
        file,
        unresolvedCode: DIAGNOSTIC_CODES.UNRESOLVED_VEHICLE,
      });
    }
    if (mission.resetPlayerInCarLocator) {
      checks.push({
        reference: mission.resetPlayerInCarLocator,
        kind: 'locators',
        pointer: 'mission.resetPlayerInCarLocator',
        file,
        unresolvedCode: DIAGNOSTIC_CODES.UNRESOLVED_LOCATOR,
      });
    }
    mission.requiredHacks.forEach((hack, index) => {
      checks.push({
        reference: hack,
        kind: 'hacks',
        pointer: `mission.requiredHacks[${index}]`,
        file,
        unresolvedCode: DIAGNOSTIC_CODES.MISSING_REQUIRED_HACK,
      });
    });

    const stageIds = new Set<string>();
    assertUniqueIds(
      bag,
      mission.stages.map((s, i) => ({ id: s.id, file, pointer: `mission.stages[${i}].id` })),
      'stage',
    );
    for (const stage of mission.stages) stageIds.add(stage.id);

    mission.stages.forEach((stage, stageIndex) => {
      const pointer = `mission.stages[${stageIndex}]`;

      // Stage transitions we can check without running the game.
      if (stage.nextStage && !stageIds.has(stage.nextStage)) {
        bag.error(
          DIAGNOSTIC_CODES.IMPOSSIBLE_STAGE_TRANSITION,
          `Stage "${stage.id}" declares nextStage "${stage.nextStage}", which does not exist in mission "${mission.id}".`,
          {
            location: { file, pointer: `${pointer}.nextStage` },
            reference: stage.nextStage,
            hint: 'Stage transitions must name a stage defined in the same mission.',
          },
        );
      }
      if (stage.nextStage === stage.id) {
        bag.error(
          DIAGNOSTIC_CODES.IMPOSSIBLE_STAGE_TRANSITION,
          `Stage "${stage.id}" declares itself as its own next stage, which cannot complete.`,
          { location: { file, pointer: `${pointer}.nextStage` } },
        );
      }

      if (stage.hudIcon) {
        checks.push({
          reference: stage.hudIcon,
          kind: 'hud-icons',
          pointer: `${pointer}.hudIcon`,
          file,
          unresolvedCode: DIAGNOSTIC_CODES.UNRESOLVED_HUD_ICON,
        });
      }

      validateObjective(bag, checks, registries, {
        stage,
        stageIndex,
        mission,
        file,
        conversationIds,
      });

      // Conditions must exist in the condition registry.
      stage.conditions.forEach((condition, conditionIndex) => {
        const resolved = resolveRecord(registries, 'conditions', condition.type);
        if (!resolved.record) {
          bag.error(
            DIAGNOSTIC_CODES.UNSUPPORTED_CONDITION,
            `Unknown mission condition "${condition.type}".`,
            {
              location: { file, pointer: `${pointer}.conditions[${conditionIndex}].type` },
              reference: condition.type,
              registry: 'conditions',
              hint: 'Run "sah registry search condition <name>" to see the verified condition list.',
            },
          );
        }
      });

      // Raw commands require explicit opt-in and must pass arity/scope checks.
      stage.rawCommands.forEach((raw, rawIndex) => {
        const rawPointer = `${pointer}.rawCommands[${rawIndex}]`;
        if (!mission.allowRawGameCommands) {
          bag.error(
            DIAGNOSTIC_CODES.RAW_LUA_NOT_OPTED_IN,
            `Stage "${stage.id}" uses raw command "${raw.command}" but the mission has not set allowRawGameCommands: true.`,
            {
              location: { file, pointer: rawPointer },
              hint: 'Raw Game.lua calls bypass the authoring model, so they require a deliberate opt-in on the mission.',
            },
          );
        }
        validateCommand(bag, registries, raw.command, raw.args.length, 'Stage', file, rawPointer);
      });
    });

    if (mission.stages.length === 0) {
      bag.error(DIAGNOSTIC_CODES.MISSION_WITHOUT_STAGES, `Mission "${mission.id}" has no stages.`, {
        location: { file, pointer: 'mission.stages' },
      });
    }
  }

  // --- Dialogue ---------------------------------------------------------------
  validateDialogue(bag, checks, project);

  // --- Resolve every collected reference --------------------------------------
  for (const check of checks) {
    resolveReference(bag, acceptedRisks, registries, check);
  }

  // --- Output paths -----------------------------------------------------------
  validatePaths(bag, campaign);

  return finish(bag, acceptedRisks);
}

function finish(bag: DiagnosticBag, acceptedRisks: AcceptedRisk[]): ValidationResult {
  const diagnostics = bag.sorted();
  return {
    ok: !bag.hasErrors,
    diagnostics,
    summary: bag.summary(),
    acceptedRisks,
  };
}

function assertUniqueIds(
  bag: DiagnosticBag,
  entries: Array<{ id: string; file: string; pointer: string }>,
  label: string,
): void {
  const seen = new Map<string, string>();
  for (const entry of entries) {
    const previous = seen.get(entry.id);
    if (previous) {
      bag.error(
        DIAGNOSTIC_CODES.DUPLICATE_ID,
        `Duplicate ${label} id "${entry.id}" (already defined in ${previous}).`,
        {
          location: { file: entry.file, pointer: entry.pointer },
          reference: entry.id,
          hint: `${label} ids must be unique across the whole campaign.`,
        },
      );
    } else {
      seen.set(entry.id, entry.file);
    }
  }
}

interface ObjectiveContext {
  stage: { id: string; objective: unknown };
  stageIndex: number;
  mission: { id: string; allowRawGameCommands: boolean };
  file: string;
  conversationIds: Set<string>;
}

function validateObjective(
  bag: DiagnosticBag,
  checks: ReferenceCheck[],
  registries: RegistrySet,
  context: ObjectiveContext,
): void {
  const { stage, stageIndex, mission, file, conversationIds } = context;
  const pointer = `mission.stages[${stageIndex}].objective`;
  const objective = stage.objective as { type: string } & Record<string, unknown>;

  // Map the authoring objective type onto its registry id.
  const registryId = objective.type === 'raw' ? String(objective['objective']) : objective.type;
  const resolved = resolveRecord(registries, 'objectives', registryId);

  if (!resolved.record) {
    bag.error(
      DIAGNOSTIC_CODES.UNSUPPORTED_OBJECTIVE,
      `Unknown objective type "${registryId}" in stage "${stage.id}".`,
      {
        location: { file, pointer: `${pointer}.type` },
        reference: registryId,
        registry: 'objectives',
        hint: 'Run "sah registry search objective <name>" to list verified objective types.',
      },
    );
  } else {
    const support = resolved.record['compilerSupport'];

    // `raw` objectives are the author's responsibility: they opted in, and every
    // command they supply is arity- and scope-checked separately.
    if (objective.type !== 'raw') {
      if (support === 'unsupported') {
        bag.error(
          DIAGNOSTIC_CODES.UNSUPPORTED_OBJECTIVE,
          `Objective "${registryId}" exists in the game, but this toolkit cannot generate it.`,
          {
            location: { file, pointer: `${pointer}.type` },
            reference: registryId,
            registry: 'objectives',
            hint: 'Its parameters are undocumented upstream. Use a supported objective, or set allowRawGameCommands: true and drive it with a raw objective whose calls you have verified.',
          },
        );
      } else if (support === 'partial') {
        // Emitting AddObjective("goto") without the call that sets its
        // destination would produce a mission that loads and then cannot be
        // completed. Refusing is more useful than generating that.
        bag.error(
          DIAGNOSTIC_CODES.UNSUPPORTED_OBJECTIVE,
          `Objective "${registryId}" is only partially understood: the toolkit knows the objective name but not the call sequence that configures it.`,
          {
            location: { file, pointer: `${pointer}.type` },
            reference: registryId,
            registry: 'objectives',
            hint: 'Generating it anyway would produce an uncompletable stage. Either use a raw objective with verified calls, or contribute documented parameters for this objective to data/registries/objectives.yaml.',
          },
        );
      }
    }
  }

  if (objective.type === 'raw' && !mission.allowRawGameCommands) {
    bag.error(
      DIAGNOSTIC_CODES.RAW_LUA_NOT_OPTED_IN,
      `Stage "${stage.id}" uses a raw objective but mission "${mission.id}" has not set allowRawGameCommands: true.`,
      { location: { file, pointer } },
    );
  }

  if (objective.type === 'raw') {
    const commands = (objective['commands'] ?? []) as Array<{ command: string; args: unknown[] }>;
    commands.forEach((entry, index) => {
      validateCommand(
        bag,
        registries,
        entry.command,
        entry.args.length,
        'Objective',
        file,
        `${pointer}.commands[${index}]`,
      );
    });
  }

  // Objective-specific references.
  if (objective.type === 'goto' && objective['destination']) {
    checks.push({
      reference: objective['destination'] as Reference,
      kind: 'locators',
      pointer: `${pointer}.destination`,
      file,
      unresolvedCode: DIAGNOSTIC_CODES.UNRESOLVED_LOCATOR,
    });
  }
  if (objective.type === 'talkto') {
    if (objective['character']) {
      checks.push({
        reference: objective['character'] as Reference,
        kind: 'characters',
        pointer: `${pointer}.character`,
        file,
        unresolvedCode: DIAGNOSTIC_CODES.UNRESOLVED_CHARACTER,
      });
    }
    if (objective['locator']) {
      checks.push({
        reference: objective['locator'] as Reference,
        kind: 'locators',
        pointer: `${pointer}.locator`,
        file,
        unresolvedCode: DIAGNOSTIC_CODES.UNRESOLVED_LOCATOR,
      });
    }
  }
  if (objective.type === 'getin' && objective['vehicle']) {
    checks.push({
      reference: objective['vehicle'] as Reference,
      kind: 'vehicles',
      pointer: `${pointer}.vehicle`,
      file,
      unresolvedCode: DIAGNOSTIC_CODES.UNRESOLVED_VEHICLE,
    });
  }

  // Conversation references must exist in this campaign's dialogue.
  const conversation = objective['conversation'];
  if (typeof conversation === 'string' && !conversationIds.has(conversation)) {
    bag.error(
      DIAGNOSTIC_CODES.UNRESOLVED_CONVERSATION,
      `Stage "${stage.id}" references conversation "${conversation}", which is not defined in any dialogue file.`,
      {
        location: { file, pointer: `${pointer}.conversation` },
        reference: conversation,
        hint: 'Add the conversation with "sah dialogue new", or list its file in campaign.dialogueFiles.',
      },
    );
  }
}

/** Checks a command exists, has the right arity, and is legal in this scope. */
function validateCommand(
  bag: DiagnosticBag,
  registries: RegistrySet,
  command: string,
  argCount: number,
  scope: string,
  file: string,
  pointer: string,
): void {
  const resolved = resolveRecord(registries, 'commands', command);
  const record = resolved.record;

  if (!record) {
    bag.error(DIAGNOSTIC_CODES.UNSUPPORTED_COMMAND, `Unknown script command "${command}".`, {
      location: { file, pointer },
      reference: command,
      registry: 'commands',
      hint: 'Run "sah registry search command <name>". Commands are derived from Game.lua, so a name missing here does not exist there either.',
    });
    return;
  }

  const minArgs = Number(record['minArgs'] ?? 0);
  const maxArgs = Number(record['maxArgs'] ?? 0);
  if (argCount < minArgs || argCount > maxArgs) {
    bag.error(
      DIAGNOSTIC_CODES.COMMAND_ARITY,
      `Command "${record.displayName}" takes ${
        minArgs === maxArgs ? `${minArgs}` : `${minArgs}–${maxArgs}`
      } argument(s), but ${argCount} were given.`,
      {
        location: { file, pointer },
        reference: command,
        registry: 'commands',
        hint: 'Argument counts come from Game.lua’s own command table.',
      },
    );
  }

  const requiresScope = record['requiresScope'];
  if (typeof requiresScope === 'string' && requiresScope !== scope) {
    bag.error(
      DIAGNOSTIC_CODES.COMMAND_SCOPE,
      `Command "${record.displayName}" must appear inside a ${requiresScope} scope, but it was used in a ${scope} scope.`,
      {
        location: { file, pointer },
        reference: command,
        registry: 'commands',
      },
    );
  }

  const usage = record['usage'];
  if (usage === 'unused' || usage === 'commented') {
    bag.warn(
      DIAGNOSTIC_CODES.EXPERIMENTAL_REFERENCE,
      `Command "${record.displayName}" is marked "${usage}" in Donut Team's documentation — Radical's own scripts never used it in a working form.`,
      {
        location: { file, pointer },
        reference: command,
        registry: 'commands',
        hint: 'It may do nothing. Verify in-game before relying on it.',
      },
    );
  }
}

function validateDialogue(
  bag: DiagnosticBag,
  checks: ReferenceCheck[],
  project: CampaignProject,
): void {
  const missionIds = new Set(project.missions.map((m) => m.mission.id));

  for (const { conversation, file } of project.conversations) {
    const lineIds = new Set<string>();

    if (conversation.mission && !missionIds.has(conversation.mission)) {
      bag.error(
        DIAGNOSTIC_CODES.DIALOGUE_UNRESOLVED_REFERENCE,
        `Conversation "${conversation.id}" is attached to mission "${conversation.mission}", which does not exist.`,
        {
          location: { file, pointer: `conversations.${conversation.id}.mission` },
          reference: conversation.mission,
        },
      );
    }

    conversation.lines.forEach((line, index) => {
      const pointer = `conversations.${conversation.id}.lines[${index}]`;

      if (lineIds.has(line.id)) {
        bag.error(
          DIAGNOSTIC_CODES.DUPLICATE_ID,
          `Duplicate dialogue line id "${line.id}" in conversation "${conversation.id}".`,
          { location: { file, pointer }, reference: line.id },
        );
      }
      lineIds.add(line.id);

      if (line.text.trim().length === 0) {
        bag.error(
          DIAGNOSTIC_CODES.DIALOGUE_MISSING_TEXT,
          `Dialogue line "${line.id}" has no text.`,
          { location: { file, pointer: `${pointer}.text` } },
        );
      }

      // Missing audio is a warning: text-only dialogue is a legitimate choice,
      // and this toolkit will never ship extracted game audio.
      if (!line.audio) {
        bag.info(
          DIAGNOSTIC_CODES.DIALOGUE_MISSING_AUDIO,
          `Dialogue line "${line.id}" has no audio reference; it will be text-only.`,
          {
            location: { file, pointer: `${pointer}.audio` },
            hint: 'Supply your own recorded audio if you want voiced dialogue. Never extract or redistribute the game’s audio.',
          },
        );
      }

      checks.push({
        reference: line.speaker,
        kind: 'characters',
        pointer: `${pointer}.speaker`,
        file,
        unresolvedCode: DIAGNOSTIC_CODES.UNRESOLVED_SPEAKER,
      });
    });

    // Duplicate ordering is not fatal but almost always a mistake.
    const orders = conversation.lines.map((l) => l.order);
    if (new Set(orders).size !== orders.length) {
      bag.warn(
        DIAGNOSTIC_CODES.DIALOGUE_UNRESOLVED_REFERENCE,
        `Conversation "${conversation.id}" has lines sharing the same order value, so playback order is ambiguous.`,
        { location: { file, pointer: `conversations.${conversation.id}.lines` } },
      );
    }
  }
}

function validatePaths(bag: DiagnosticBag, campaign: Campaign): void {
  const declared: string[] = [
    ...campaign.missionFiles,
    ...campaign.dialogueFiles,
    ...campaign.presetFiles,
    ...campaign.assetDirectories,
  ];

  for (const declaredPath of declared) {
    for (const issue of inspectGamePath(declaredPath)) {
      const code =
        issue.kind === 'traversal' || issue.kind === 'absolute'
          ? DIAGNOSTIC_CODES.UNSAFE_OUTPUT_PATH
          : DIAGNOSTIC_CODES.MALFORMED_WINDOWS_PATH;
      bag.error(code, issue.message, {
        location: { file: 'campaign.yaml' },
        reference: declaredPath,
        hint: 'Mods are loaded on Windows even when authored elsewhere, so paths must be valid there.',
      });
    }
  }

  for (const collision of findCaseCollisions(declared)) {
    bag.error(
      DIAGNOSTIC_CODES.PATH_CASING,
      `Paths differ only by capitalisation: ${collision.members.join(', ')}.`,
      {
        location: { file: 'campaign.yaml' },
        hint: 'Windows treats these as one file; Linux treats them as two. Rename one.',
      },
    );
  }
}

function resolveReference(
  bag: DiagnosticBag,
  acceptedRisks: AcceptedRisk[],
  registries: RegistrySet,
  check: ReferenceCheck,
): void {
  const id = referenceId(check.reference);
  const resolved = resolveRecord(registries, check.kind, id);
  const record: LoadedRecord | undefined = resolved.record;

  if (!record) {
    const code = check.unresolvedCode ?? UNRESOLVED_CODES[check.kind];
    bag.error(code, `Unresolved ${singular(check.kind)} reference "${id}".`, {
      location: { file: check.file, pointer: check.pointer },
      reference: id,
      registry: check.kind,
      hint: unresolvedHint(check.kind, id),
    });
    return;
  }

  if (isBuildable(record.verificationStatus)) {
    if (record.verificationStatus === 'experimental') {
      bag.warn(
        DIAGNOSTIC_CODES.EXPERIMENTAL_REFERENCE,
        `${singular(check.kind)} "${id}" is marked experimental; it has not been confirmed against a real game.`,
        {
          location: { file: check.file, pointer: check.pointer },
          reference: id,
          registry: check.kind,
        },
      );
    }
    return;
  }

  // Not buildable. Either the author accepted the risk, or this is an error.
  if (referenceAllowsUnverified(check.reference)) {
    const reason = referenceReason(check.reference) ?? '(no reason given)';
    acceptedRisks.push({
      reference: id,
      registry: check.kind,
      status: record.verificationStatus,
      reason,
      location: `${check.file}#${check.pointer}`,
    });
    bag.warn(
      DIAGNOSTIC_CODES.UNVERIFIED_OVERRIDE_USED,
      `Building with ${singular(check.kind)} "${id}" despite status "${record.verificationStatus}". Reason given: ${reason}`,
      {
        location: { file: check.file, pointer: check.pointer },
        reference: id,
        registry: check.kind,
        hint: 'This override is recorded in the build manifest.',
      },
    );
    return;
  }

  bag.error(
    DIAGNOSTIC_CODES.REFERENCE_NOT_BUILDABLE,
    `${singular(check.kind)} "${id}" has verification status "${record.verificationStatus}" and cannot be built.`,
    {
      location: { file: check.file, pointer: check.pointer },
      reference: id,
      registry: check.kind,
      hint: `Verify the record and update data/registries, or opt in explicitly with { ref: "${id}", allowUnverified: true, reason: "..." }.`,
    },
  );
}

function singular(kind: RegistryKind): string {
  const names: Partial<Record<RegistryKind, string>> = {
    locations: 'Location',
    locators: 'Locator',
    characters: 'Character',
    vehicles: 'Vehicle',
    levels: 'Level',
    'hud-icons': 'HUD icon',
    hacks: 'Hack',
    objectives: 'Objective',
    conditions: 'Condition',
    commands: 'Command',
  };
  return names[kind] ?? kind;
}

function unresolvedHint(kind: RegistryKind, id: string): string {
  switch (kind) {
    case 'locations':
      return `No location has been verified yet, so every location reference fails. Add "${id}" to data/registries/locations.yaml with a provenance source once you can cite one.`;
    case 'locators':
      return `Search with "sah registry search locator ${id}". The locator registry is deliberately tiny; expanding it with cited sources is the highest-value contribution to this project.`;
    case 'vehicles':
      return `The vehicle registry is empty because no source consulted so far states any vehicle's internal name. Do not guess "${id}" — find a citable source first.`;
    case 'characters':
      return `Run "sah registry search character ${id}". 64 characters are verified from Donut Team's documentation.`;
    case 'hacks':
      return `Run "sah registry search hack ${id}" to see the recorded Mod Launcher hacks.`;
    default:
      return `Run "sah registry search ${kind} ${id}".`;
  }
}
