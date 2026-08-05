import { z } from 'zod';
import { IdSchema, NotesSchema, SemverishSchema, VerificationStatusSchema } from './common.js';

/**
 * The campaign document: the root of an authored project.
 *
 * A campaign references missions and dialogue by file, so a large project stays
 * navigable. `sah validate` loads the whole graph and checks it as one unit.
 */

export const AuthorSchema = z.object({
  name: z.string().min(1),
  website: z.string().url().optional(),
  notes: z.string().optional(),
  /** Author groups, mirroring Meta.ini's AuthorGroup support. */
  group: z.string().optional(),
  credits: z.boolean().default(false),
});

const CompatibilityShape = z.object({
  /**
   * Whether Lucas' Mod Launcher is required. It always is, in practice —
   * this toolkit generates Mod Launcher mods and nothing else.
   */
  modLauncher: z.enum(['required']).default('required'),
  /** Minimum Mod Launcher version, written to Meta.ini as RequiredLauncher. */
  requiredLauncherVersion: z.string().optional(),
  /** An external connected-map mod this campaign targets. */
  connectedMap: z
    .object({
      /** Compatibility profile registry id. */
      profile: IdSchema,
      /** Who supplies it. Always the user — this repo ships no third-party mods. */
      provider: z.literal('user'),
      status: VerificationStatusSchema,
    })
    .optional(),
  /** Game editions this campaign supports, mirroring Meta.ini's Supports* keys. */
  supportsEnglish: z.boolean().default(true),
  supportsDemo: z.boolean().default(false),
  supportsInternational: z.boolean().default(true),
  supportsBestSellerSeries: z.boolean().default(true),
});

export const CompatibilitySchema = CompatibilityShape;

/**
 * Every field of `CompatibilityShape` has its own default, so an omitted
 * `compatibility` block is equivalent to an empty one. Parsing `{}` produces
 * the fully-defaulted object that `.default()` requires as its output type.
 */
const COMPATIBILITY_DEFAULT = CompatibilityShape.parse({});

export const CampaignSchema = z.object({
  id: IdSchema,
  title: z.string().min(1),
  version: SemverishSchema,
  description: z.string().min(1),
  /**
   * Meta.ini InternalName. Used for folder names and saved-game directories, so
   * it must be valid as a Windows folder name.
   */
  internalName: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9._-]+$/, 'must be safe as a Windows folder name'),
  authors: z.array(AuthorSchema).default([]),
  categories: z.array(z.string()).default([]),
  compatibility: CompatibilityShape.default(COMPATIBILITY_DEFAULT),
  /** Whether this is a "Main" mod in Meta.ini terms. */
  main: z.boolean().default(true),
  /** Night preset id applied by default. */
  defaultPreset: IdSchema.optional(),
  /** Mission files, relative to the campaign root. */
  missionFiles: z.array(z.string()).default([]),
  /** Dialogue files, relative to the campaign root. */
  dialogueFiles: z.array(z.string()).default([]),
  /** Night preset files, relative to the campaign root. */
  presetFiles: z.array(z.string()).default([]),
  /** Launcher hacks required by the campaign as a whole. */
  requiredHacks: z.array(IdSchema).default([]),
  /** User-supplied asset directories copied verbatim into the build. */
  assetDirectories: z.array(z.string()).default([]),
  /** Overall honest status of the campaign. */
  status: VerificationStatusSchema.default('planned'),
  notes: NotesSchema,
});

export type Campaign = z.infer<typeof CampaignSchema>;

export const CampaignFileSchema = z.object({
  version: z.literal(1),
  campaign: CampaignSchema,
});

export type CampaignFile = z.infer<typeof CampaignFileSchema>;
