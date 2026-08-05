import { z } from 'zod';
import { IdSchema, NotesSchema, VerificationStatusSchema } from './common.js';

/**
 * Night preset manifests.
 *
 * A preset is a *design document with support metadata*, not a promise. Each
 * individual setting carries its own verification status, because "the manifest
 * declares fog" and "the game renders that fog" are different claims.
 *
 * No preset in this repository ships replacement assets. Assets are declared as
 * external requirements the user must supply themselves.
 */

export const PresetSettingSchema = z.object({
  /** What this setting is meant to change. */
  description: z.string().min(1),
  /**
   * Support status for THIS SETTING specifically. `planned` and `unverified`
   * are the honest defaults for most night-lighting work today.
   */
  status: VerificationStatusSchema,
  /** How it would be implemented, when known. */
  mechanism: z.string().optional(),
  /** Registry id of a Launcher hack this setting depends on. */
  requiredHack: IdSchema.optional(),
  notes: NotesSchema,
});

export const ExternalAssetRequirementSchema = z.object({
  id: IdSchema,
  description: z.string().min(1),
  /** Where the user is expected to obtain it. Never bundled here. */
  obtainFrom: z.string().optional(),
  /** Path inside the campaign the user should place it at. */
  expectedPath: z.string().optional(),
  required: z.boolean().default(true),
});

export const NightPresetSchema = z.object({
  id: IdSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  /** Overall status of the preset as a whole. */
  status: VerificationStatusSchema,
  /** Level or map registry ids this preset is intended for. */
  supportedMaps: z.array(IdSchema).default([]),
  /** Launcher hacks the preset needs. */
  requiredHacks: z.array(IdSchema).default([]),
  settings: z
    .object({
      sky: PresetSettingSchema.optional(),
      lighting: PresetSettingSchema.optional(),
      fog: PresetSettingSchema.optional(),
      ambience: PresetSettingSchema.optional(),
      traffic: PresetSettingSchema.optional(),
      pedestrians: PresetSettingSchema.optional(),
      postProcessing: PresetSettingSchema.optional(),
    })
    .default({}),
  /** Assets the user must supply. This repository ships none of them. */
  externalAssets: z.array(ExternalAssetRequirementSchema).default([]),
  /** Known conflicts with other mods or presets. */
  conflicts: z.array(z.string()).default([]),
  notes: NotesSchema,
});

export type NightPreset = z.infer<typeof NightPresetSchema>;

export const NightPresetFileSchema = z.object({
  version: z.literal(1),
  preset: NightPresetSchema,
});
