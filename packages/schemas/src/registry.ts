import { z } from 'zod';
import { IdSchema, ProvenanceRefSchema, VerificationStatusSchema } from './common.js';

/**
 * Registry records: the toolkit's model of what actually exists in the game.
 *
 * Every record carries a verification status and a provenance reference. A
 * record without provenance is a validation error, which is what stops guesses
 * from accumulating in the database over time.
 */

export const REGISTRY_KINDS = [
  'locations',
  'maps',
  'levels',
  'interiors',
  'locators',
  'characters',
  'vehicles',
  'objectives',
  'conditions',
  'commands',
  'hacks',
  'assets',
  'hud-icons',
  'preset-capabilities',
  'compatibility-profiles',
] as const;

export type RegistryKind = (typeof REGISTRY_KINDS)[number];

export const RegistryKindSchema = z.enum(REGISTRY_KINDS);

/** Fields every registry record shares. */
export const RegistryRecordBaseSchema = z.object({
  id: IdSchema,
  displayName: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  category: z.string().optional(),
  /** The identifier the game itself uses, when known. */
  gameCode: z.string().optional(),
  verificationStatus: VerificationStatusSchema,
  /** ISO-8601 date this record's status was last established. */
  verifiedAt: z.string().optional(),
  provenance: ProvenanceRefSchema,
  tags: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([]),
});

/** A place in the world. Deliberately unseeded — none are verified yet. */
export const LocationRecordSchema = RegistryRecordBaseSchema.extend({
  /** Level registry id this location sits in. */
  level: IdSchema.optional(),
  map: IdSchema.optional(),
  /** Locator registry id used to reach it, when one is known. */
  locator: IdSchema.optional(),
  interior: IdSchema.optional(),
});

export const MapRecordSchema = RegistryRecordBaseSchema.extend({
  /** Zone P3D files that make up this map, when known. */
  zoneFiles: z.array(z.string()).default([]),
});

export const LevelRecordSchema = RegistryRecordBaseSchema.extend({
  /** Script directory, e.g. `scripts\missions\level01`. */
  scriptPath: z.string().optional(),
  /** Art directory, e.g. `art\missions\level01`. */
  artPath: z.string().optional(),
  /** Dyna load data string associated with the level, when documented. */
  dynaLoadData: z.string().optional(),
});

export const InteriorRecordSchema = RegistryRecordBaseSchema.extend({
  level: IdSchema.optional(),
  p3dFile: z.string().optional(),
});

export const LocatorRecordSchema = RegistryRecordBaseSchema.extend({
  /** Locator type, e.g. "Type 3". Names come from the documented locator types. */
  locatorType: z.string().optional(),
  level: IdSchema.optional(),
  map: IdSchema.optional(),
});

export const CharacterRecordSchema = RegistryRecordBaseSchema.extend({
  /** 3-4 character dialogue code, e.g. "Brt". */
  dialogueCode: z.string().optional(),
  /** Index in the game's non-generic character table, when it has one. */
  characterIndex: z.number().int().nonnegative().optional(),
  /** Outfit internal names associated with this character. */
  outfits: z.array(z.string()).default([]),
  generic: z.boolean().default(false),
});

export const VehicleRecordSchema = RegistryRecordBaseSchema.extend({
  /** CON script path, when known. */
  conFile: z.string().optional(),
  p3dFile: z.string().optional(),
});

export const ObjectiveRecordSchema = RegistryRecordBaseSchema.extend({
  /** Which hack provides it, or "base-game". */
  providedBy: z.string().default('base-game'),
  /** Whether the toolkit's compiler can emit this objective today. */
  compilerSupport: z.enum(['supported', 'partial', 'unsupported']).default('unsupported'),
  /** Documented parameters, when upstream documents them. */
  parameters: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        required: z.boolean().default(true),
      }),
    )
    .default([]),
});

export const ConditionRecordSchema = RegistryRecordBaseSchema.extend({
  providedBy: z.string().default('base-game'),
});

/**
 * A script command.
 *
 * Arity and scope come from upstream Game.lua's own command tables, which makes
 * them mechanically checkable rather than transcribed by hand.
 */
export const CommandRecordSchema = RegistryRecordBaseSchema.extend({
  minArgs: z.number().int().nonnegative(),
  maxArgs: z.number().int().nonnegative(),
  /** Scope the command must appear inside, e.g. "Stage", "Objective". */
  requiresScope: z.string().optional(),
  /** Scope the command opens, e.g. AddStage opens "Stage". */
  opensScope: z.string().optional(),
  /** Scope the command closes. */
  closesScope: z.string().optional(),
  /** Whether the command opens a conditional block needing Game.EndIf(). */
  conditional: z.boolean().default(false),
  /** Hack that provides the command, or "Default" for the base game. */
  providedByHack: z.string().default('Default'),
  /** Marked Unused/Commented in Radical's own scripts, per Donut Team's docs. */
  usage: z.enum(['used', 'unused', 'commented', 'unknown']).default('unknown'),
});

export const HackRecordSchema = RegistryRecordBaseSchema.extend({
  /** Value used in Meta.ini's RequiredHack key. */
  metaIniName: z.string().min(1),
  /** Mod Launcher version the hack appeared in. */
  availableSince: z.string().optional(),
  /** Configuration file the hack expects, if any. */
  configFile: z.string().optional(),
});

export const AssetRecordSchema = RegistryRecordBaseSchema.extend({
  assetType: z.string().optional(),
  /** Path within the game or mod. Never a path into this repository. */
  path: z.string().optional(),
});

export const HudIconRecordSchema = RegistryRecordBaseSchema.extend({});

export const PresetCapabilityRecordSchema = RegistryRecordBaseSchema.extend({
  /** What would have to be true for this capability to work. */
  mechanism: z.string().optional(),
});

export const CompatibilityProfileRecordSchema = RegistryRecordBaseSchema.extend({
  externalDependency: z.string().min(1),
});

const RECORD_SCHEMAS = {
  locations: LocationRecordSchema,
  maps: MapRecordSchema,
  levels: LevelRecordSchema,
  interiors: InteriorRecordSchema,
  locators: LocatorRecordSchema,
  characters: CharacterRecordSchema,
  vehicles: VehicleRecordSchema,
  objectives: ObjectiveRecordSchema,
  conditions: ConditionRecordSchema,
  commands: CommandRecordSchema,
  hacks: HackRecordSchema,
  assets: AssetRecordSchema,
  'hud-icons': HudIconRecordSchema,
  'preset-capabilities': PresetCapabilityRecordSchema,
  'compatibility-profiles': CompatibilityProfileRecordSchema,
} as const satisfies Record<RegistryKind, z.ZodType>;

export function recordSchemaFor(kind: RegistryKind): z.ZodType {
  return RECORD_SCHEMAS[kind];
}

/** A registry file on disk: one kind per file. */
export const RegistryFileSchema = z.object({
  version: z.literal(1),
  registry: RegistryKindSchema,
  /** Explains what is and is not in this registry. Required — honesty by default. */
  description: z.string().min(1),
  records: z.array(z.unknown()).default([]),
});

export type RegistryFile = z.infer<typeof RegistryFileSchema>;

export type RegistryRecordBase = z.infer<typeof RegistryRecordBaseSchema>;
export type CommandRecord = z.infer<typeof CommandRecordSchema>;
export type CharacterRecord = z.infer<typeof CharacterRecordSchema>;
export type ObjectiveRecord = z.infer<typeof ObjectiveRecordSchema>;
export type HackRecord = z.infer<typeof HackRecordSchema>;
export type LocatorRecord = z.infer<typeof LocatorRecordSchema>;
export type LevelRecord = z.infer<typeof LevelRecordSchema>;
