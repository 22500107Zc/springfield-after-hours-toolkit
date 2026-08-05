import { DIAGNOSTIC_CODES } from './diagnostics.js';

/**
 * Human explanations for diagnostic codes.
 *
 * These back both `sah explain <code>` and the MCP `explain_diagnostic` tool,
 * so a language model asking "why did this fail" gets the same answer a person
 * does — including the reasoning, not just the rule.
 */

export interface DiagnosticHelp {
  title: string;
  meaning: string;
  fixes: string[];
  /** Why the toolkit treats this as an error rather than letting it slide. */
  why?: string;
}

export const DIAGNOSTIC_HELP: Record<string, DiagnosticHelp> = {
  [DIAGNOSTIC_CODES.SCHEMA_INVALID]: {
    title: 'Document does not match its schema',
    meaning:
      'A campaign, mission, dialogue or preset file has a field that is missing, misspelled, or of the wrong type.',
    fixes: [
      'Read the field path in the message — it points at the exact key.',
      'Compare against examples/minimal-campaign, which is known to be valid.',
      'Remember that ids must be lower-kebab-case.',
    ],
  },
  [DIAGNOSTIC_CODES.DUPLICATE_ID]: {
    title: 'Duplicate identifier',
    meaning: 'Two records share an id that must be unique across the campaign.',
    fixes: ['Rename one of them.'],
    why: 'Ids become filenames, Lua identifiers and INI keys. A duplicate silently overwrites.',
  },
  [DIAGNOSTIC_CODES.MISSING_PROVENANCE]: {
    title: 'Registry record cites an unknown source',
    meaning:
      'A registry record points at a provenance source id that does not exist in data/provenance/sources.yaml.',
    fixes: [
      'Add the source to data/provenance/sources.yaml with its URL and retrieval date.',
      'Or correct the source id on the record.',
    ],
    why: 'Provenance is what separates a verified fact from a guess. A record whose source cannot be resolved is not evidence of anything.',
  },
  [DIAGNOSTIC_CODES.UNRESOLVED_LOCATION]: {
    title: 'Unresolved location',
    meaning: 'The campaign references a Springfield location that has no verified registry record.',
    fixes: [
      'Run "sah registry search location <name>" to confirm.',
      'If you can cite a source for the location, add it to data/registries/locations.yaml.',
      'Otherwise, restructure the mission to use content that is verified.',
    ],
    why: 'The locations registry is currently empty. Generating a mission that drives to a place the toolkit cannot prove exists produces a mission nobody can finish.',
  },
  [DIAGNOSTIC_CODES.UNRESOLVED_LOCATOR]: {
    title: 'Unresolved locator',
    meaning:
      'The campaign references a locator (a named point in the world) with no verified registry record.',
    fixes: [
      'Run "sah registry search locator <name>".',
      'Add the locator to data/registries/locators.yaml with a provenance source.',
      'Use one of the documented example locators while prototyping.',
    ],
    why: 'Locators are the single biggest gap in the registry. Expanding it with cited sources is the highest-value contribution to this project.',
  },
  [DIAGNOSTIC_CODES.UNRESOLVED_CHARACTER]: {
    title: 'Unresolved character',
    meaning: 'A character reference does not match any record in the character registry.',
    fixes: [
      'Run "sah registry search character <name>" — 64 characters are verified.',
      'Use the registry id (e.g. "cbg" for Comic Book Guy), not a display name.',
    ],
  },
  [DIAGNOSTIC_CODES.UNRESOLVED_VEHICLE]: {
    title: 'Unresolved vehicle',
    meaning: 'A vehicle reference has no verified registry record.',
    fixes: [
      'The vehicle registry is empty: no source consulted so far states any vehicle internal name.',
      'Find a citable source for the vehicle name, then add it to data/registries/vehicles.yaml.',
      'Do not guess the internal name.',
    ],
    why: 'A wrong vehicle code produces a mission that fails to load a car, with no error the player can interpret.',
  },
  [DIAGNOSTIC_CODES.UNRESOLVED_LEVEL]: {
    title: 'Unresolved level',
    meaning: 'The mission references a level with no verified registry record.',
    fixes: [
      'Run "sah registry search level".',
      'Only level01 is currently verified, from official documentation examples.',
    ],
  },
  [DIAGNOSTIC_CODES.UNRESOLVED_HUD_ICON]: {
    title: 'Unresolved HUD icon',
    meaning: 'The stage references a HUD icon with no verified registry record.',
    fixes: [
      'Run "sah registry search hud-icon".',
      'Remove the hudIcon field if you do not need one.',
    ],
  },
  [DIAGNOSTIC_CODES.UNRESOLVED_MISSION_REF]: {
    title: 'Unresolved mission reference',
    meaning: 'Something references a mission id that no mission file defines.',
    fixes: [
      'Check the id spelling.',
      'Confirm the mission file is listed in campaign.missionFiles.',
    ],
  },
  [DIAGNOSTIC_CODES.UNREACHABLE_STAGE]: {
    title: 'Unreachable stage',
    meaning: 'A stage exists but nothing transitions to it, so it can never run.',
    fixes: [
      'Point some stage at it with nextStage, or remove it.',
      'Note that stages run in order by default; nextStage is only needed for non-linear flow.',
    ],
  },
  [DIAGNOSTIC_CODES.STAGE_WITHOUT_OBJECTIVE]: {
    title: 'Stage has no objective',
    meaning: 'A stage needs an objective for the player to have something to do.',
    fixes: ['Add an objective. Use "dummy" if you are still sketching the structure.'],
  },
  [DIAGNOSTIC_CODES.DIALOGUE_UNRESOLVED_REFERENCE]: {
    title: 'Dialogue references something that does not exist',
    meaning:
      'A conversation points at a mission or stage that is not defined, or its line ordering is ambiguous.',
    fixes: [
      'Correct the mission or stage id.',
      'Give each line in a conversation a distinct order value.',
    ],
  },
  [DIAGNOSTIC_CODES.DIALOGUE_EXPORT_UNSUPPORTED]: {
    title: 'Dialogue cannot be exported to a game format',
    meaning:
      "The toolkit has not verified the game's dialogue file formats, so it exports structured JSON plus a report of the manual steps instead.",
    fixes: [
      'Read Resources/dialogue/REMAINING-MANUAL-STEPS.md in the build output.',
      'Produce the game-side text resources yourself for now.',
    ],
    why: 'Guessing at a binary format would produce a file that either fails to load or silently plays nothing — worse than producing nothing.',
  },
  [DIAGNOSTIC_CODES.COMPAT_DEPENDENCY_MISSING]: {
    title: 'External mod dependency is missing',
    meaning:
      'The campaign targets an externally installed mod (such as a connected-map mod) that was not found.',
    fixes: [
      'Set connectedMapPath in your configuration to point at your own installation.',
      'Remove the compatibility declaration if the campaign does not really need it.',
    ],
    why: 'This toolkit never bundles third-party mods. They are always user-supplied.',
  },
  [DIAGNOSTIC_CODES.PLATFORM_LIMITATION]: {
    title: 'Platform limitation',
    meaning: 'The requested action cannot be performed on this operating system.',
    fixes: [
      'Authoring, validating, building and packaging work everywhere; only launching the game is Windows-only.',
      'Run "sah doctor" to see exactly what this platform supports.',
    ],
  },
  [DIAGNOSTIC_CODES.UNRESOLVED_CONVERSATION]: {
    title: 'Unresolved conversation',
    meaning: 'A stage references a conversation id that no dialogue file defines.',
    fixes: [
      'Create it with "sah dialogue new <id>".',
      'Confirm the dialogue file is listed in campaign.dialogueFiles.',
    ],
  },
  [DIAGNOSTIC_CODES.UNRESOLVED_SPEAKER]: {
    title: 'Unresolved dialogue speaker',
    meaning: 'A dialogue line names a speaker with no verified character record.',
    fixes: [
      'Run "sah registry search character <name>".',
      'For an original character, you will need the CustomDialogueCharacterCodes hack and your own registry record.',
    ],
  },
  [DIAGNOSTIC_CODES.UNRESOLVED_PRESET]: {
    title: 'Unresolved night preset',
    meaning: 'campaign.defaultPreset names a preset that no preset file defines.',
    fixes: ['Add the preset file to campaign.presetFiles, or remove defaultPreset.'],
  },
  [DIAGNOSTIC_CODES.REFERENCE_NOT_BUILDABLE]: {
    title: 'Reference is not verified enough to build',
    meaning:
      'The record exists, but its verification status is not "verified" or "experimental", so the toolkit will not build with it by default.',
    fixes: [
      'Verify the record and update its status in data/registries.',
      'Or opt in explicitly: { ref: "the-id", allowUnverified: true, reason: "why you accept this" }.',
    ],
    why: 'Explicit opt-in makes the risk visible in the build manifest instead of hiding it.',
  },
  [DIAGNOSTIC_CODES.EXPERIMENTAL_REFERENCE]: {
    title: 'Experimental reference (warning)',
    meaning: 'The record is usable but has not been confirmed against a real game.',
    fixes: ['No action required. Test in-game before releasing.'],
  },
  [DIAGNOSTIC_CODES.UNVERIFIED_OVERRIDE_USED]: {
    title: 'Unverified reference accepted (warning)',
    meaning: 'You explicitly opted into a reference the toolkit would otherwise reject.',
    fixes: ['No action required. The override is recorded in the build manifest.'],
  },
  [DIAGNOSTIC_CODES.UNSUPPORTED_OBJECTIVE]: {
    title: 'Objective cannot be generated',
    meaning:
      'The objective type exists in the game, but the toolkit does not know the call sequence that configures it.',
    fixes: [
      'Use the "dummy" objective while prototyping the structure.',
      'Set allowRawGameCommands: true on the mission and drive the objective with raw, verified Game.* calls.',
      'Contribute documented parameters to data/registries/objectives.yaml.',
    ],
    why: 'Most objective pages in Donut Team\'s documentation currently read "TODO". Emitting an objective without its configuration calls produces a stage that loads and can never be completed.',
  },
  [DIAGNOSTIC_CODES.UNSUPPORTED_CONDITION]: {
    title: 'Unknown mission condition',
    meaning: 'The condition type is not in the verified condition registry.',
    fixes: ['Run "sah registry search condition <name>".'],
  },
  [DIAGNOSTIC_CODES.UNSUPPORTED_COMMAND]: {
    title: 'Unknown script command',
    meaning: 'A raw command name does not exist in the command registry.',
    fixes: [
      'Run "sah registry search command <name>".',
      'Check the spelling and capitalisation — command names are case-sensitive in the game.',
    ],
    why: 'The command registry is derived directly from Game.lua. A name missing here does not exist there either, so the script would error at runtime.',
  },
  [DIAGNOSTIC_CODES.COMMAND_ARITY]: {
    title: 'Wrong number of command arguments',
    meaning: 'A raw command was given more or fewer arguments than Game.lua accepts.',
    fixes: ['Run "sah registry search command <name>" to see its minArgs and maxArgs.'],
    why: "Argument counts come from Game.lua's own command table, which validates them at runtime and raises a Lua error.",
  },
  [DIAGNOSTIC_CODES.COMMAND_SCOPE]: {
    title: 'Command used in the wrong scope',
    meaning:
      'A command that must appear inside a particular scope (Mission, Stage, Objective, Condition) was used somewhere else.',
    fixes: [
      'Move the command to the correct scope.',
      'Run "sah registry search command <name>" to see its requiresScope value.',
    ],
  },
  [DIAGNOSTIC_CODES.MISSING_REQUIRED_HACK]: {
    title: 'Unknown or missing Mod Launcher hack',
    meaning: 'A required hack does not resolve in the hack registry.',
    fixes: ['Run "sah registry search hack".', 'Use the registry id, e.g. "custom-files".'],
  },
  [DIAGNOSTIC_CODES.RAW_LUA_NOT_OPTED_IN]: {
    title: 'Raw commands used without opting in',
    meaning:
      'The mission uses a raw objective or raw commands but has not set allowRawGameCommands: true.',
    fixes: ['Add "allowRawGameCommands: true" to the mission if you intend to use raw calls.'],
    why: 'Raw calls bypass the authoring model, so they require a deliberate decision rather than happening by accident.',
  },
  [DIAGNOSTIC_CODES.IMPOSSIBLE_STAGE_TRANSITION]: {
    title: 'Impossible stage transition',
    meaning: 'A stage points at a next stage that does not exist, or at itself.',
    fixes: ['Correct the nextStage value, or remove it.'],
  },
  [DIAGNOSTIC_CODES.MISSION_WITHOUT_STAGES]: {
    title: 'Mission has no stages',
    meaning: 'A mission needs at least one stage to do anything.',
    fixes: ['Add a stage with at least one objective.'],
  },
  [DIAGNOSTIC_CODES.DIALOGUE_MISSING_TEXT]: {
    title: 'Dialogue line has no text',
    meaning: 'A line exists but its text is empty.',
    fixes: ['Write the line, or delete it.'],
  },
  [DIAGNOSTIC_CODES.DIALOGUE_MISSING_AUDIO]: {
    title: 'Dialogue line has no audio (note)',
    meaning: 'The line will be text-only.',
    fixes: [
      'This is fine — text-only dialogue is fully supported.',
      "Supply your own recordings if you want voiced lines. Never extract or redistribute the game's audio.",
    ],
  },
  [DIAGNOSTIC_CODES.UNSAFE_OUTPUT_PATH]: {
    title: 'Unsafe path',
    meaning: 'A path would read or write outside the campaign directory.',
    fixes: [
      'Use a path relative to the campaign root, with no ".." segments and no drive letters.',
    ],
    why: 'The same guard protects the MCP server, where the caller is a language model rather than a person.',
  },
  [DIAGNOSTIC_CODES.OUTPUT_COLLISION]: {
    title: 'Two files would be written to the same path',
    meaning: 'Two missions generate the same output filename.',
    fixes: ['Give the missions distinct gameMissionName values.'],
  },
  [DIAGNOSTIC_CODES.MALFORMED_WINDOWS_PATH]: {
    title: 'Path is not valid on Windows',
    meaning:
      'A path contains a character Windows forbids, a reserved device name, or a trailing space or dot.',
    fixes: ['Rename the file or directory.'],
    why: 'Mods are loaded on Windows even when authored on macOS or Linux.',
  },
  [DIAGNOSTIC_CODES.PATH_CASING]: {
    title: 'Paths differ only by capitalisation',
    meaning: 'Two paths are the same file on Windows and different files on Linux.',
    fixes: ['Rename one so they differ by more than case.'],
  },
  [DIAGNOSTIC_CODES.ASSET_MISSING]: {
    title: 'Declared asset directory is missing',
    meaning: 'campaign.assetDirectories names a directory that does not exist.',
    fixes: ['Create it, or remove it from the campaign.'],
  },
  [DIAGNOSTIC_CODES.UPSTREAM_MISSING]: {
    title: 'Upstream dependency not installed',
    meaning:
      "Donut Team's Game.lua has not been fetched, so the built mod will not run until it is installed.",
    fixes: ['Run "npm run upstream:fetch", then build again.'],
    why: 'This toolkit does not redistribute Game.lua. It fetches a pinned commit on request so the licence and attribution stay intact.',
  },
  [DIAGNOSTIC_CODES.DOCUMENT_UNREADABLE]: {
    title: 'File could not be read or parsed',
    meaning: 'A referenced file is missing or contains invalid YAML/JSON.',
    fixes: ['Check the path in campaign.yaml.', 'Validate the YAML syntax.'],
  },
  [DIAGNOSTIC_CODES.EMPTY_CAMPAIGN]: {
    title: 'Campaign declares no missions (warning)',
    meaning: 'The campaign will build, but the mod will not contain any missions.',
    fixes: ['Add a mission with "sah mission new <id>", then list it in campaign.missionFiles.'],
  },
};
