import { z } from 'zod';
import { IdSchema, NotesSchema, VerificationStatusSchema } from './common.js';

/**
 * Compatibility profiles for externally installed mods.
 *
 * Fully Connected Map and Full Game Plus are the motivating cases. Neither is
 * bundled, mirrored or extracted here. A profile describes how a campaign
 * *targets* such a mod, and where the user's own copy is expected to live.
 */

export const CompatibilityProfileSchema = z.object({
  id: IdSchema,
  /** Human-readable name of the external mod. */
  externalDependency: z.string().min(1),
  description: z.string().min(1),
  /** Versions of the external mod this profile claims to describe. */
  supportedVersions: z.array(z.string()).default([]),
  /**
   * Where the user is expected to have installed it. Purely informational —
   * the toolkit reads nothing from it unless the user points a command at it.
   */
  expectedUserPath: z.string().optional(),
  /** Map registry ids the external mod provides. Empty until verified. */
  mapIds: z.array(IdSchema).default([]),
  /** Locator remappings the external mod introduces. Empty until verified. */
  locatorMappings: z
    .array(
      z.object({
        from: z.string().min(1),
        to: z.string().min(1),
        status: VerificationStatusSchema,
      }),
    )
    .default([]),
  /** Assumptions this profile makes about mission routing. */
  missionRoutingAssumptions: z.array(z.string()).default([]),
  conflicts: z.array(z.string()).default([]),
  /** Attribution for the external project. Required — credit is not optional. */
  attribution: z.string().min(1),
  status: VerificationStatusSchema,
  notes: NotesSchema,
});

export type CompatibilityProfile = z.infer<typeof CompatibilityProfileSchema>;

export const CompatibilityProfileFileSchema = z.object({
  version: z.literal(1),
  profile: CompatibilityProfileSchema,
});
