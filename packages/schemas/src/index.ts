import { z } from 'zod';

export const verificationStatuses = [
  'verified',
  'experimental',
  'community-reported',
  'unverified',
  'unsupported',
  'planned',
] as const;
export const verificationStatusSchema = z.enum(verificationStatuses);

export const provenanceSchema = z.object({
  sourceType: z.enum([
    'official-documentation',
    'official-repository',
    'user-game-file',
    'user-mod-file',
    'community-reference',
    'manual-observation',
    'toolkit-fixture',
  ]),
  sourceReference: z.string().min(1),
  verificationStatus: verificationStatusSchema,
  confidence: z.number().min(0).max(1),
  verifiedAt: z.string().date().optional(),
  license: z.string().optional(),
});

export const registryKinds = [
  'location',
  'map',
  'level',
  'interior',
  'locator',
  'character',
  'dialogue-code',
  'vehicle',
  'objective',
  'command',
  'launcher-hack',
  'asset',
  'hud-icon',
  'preset-capability',
  'compatibility-profile',
] as const;
export const registryEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  kind: z.enum(registryKinds),
  displayName: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  gameCode: z.string().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  provenance: provenanceSchema,
});

export const objectiveSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('noop'), note: z.string().min(1) }),
  z.object({ type: z.literal('goto'), destination: z.string().min(1) }),
  z.object({ type: z.literal('dialogue'), conversation: z.string().min(1) }),
]);
export const stageSchema = z.object({ id: z.string().min(1), objective: objectiveSchema });
export const missionSchema = z.object({
  id: z.string().min(1),
  player: z.string().optional(),
  startingVehicle: z.string().optional(),
  stages: z.array(stageSchema).min(1),
});
export const dialogueSchema = z.object({
  id: z.string().min(1),
  textOnlyFallback: z.boolean().default(true),
  lines: z
    .array(
      z.object({
        speaker: z.string().min(1),
        text: z.string().min(1),
        audio: z.string().optional(),
      }),
    )
    .min(1),
});
export const campaignSchema = z.object({
  campaign: z.object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().min(1),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    description: z.string().optional(),
    defaultPreset: z.string().optional(),
  }),
  missions: z.array(missionSchema).min(1),
  dialogue: z.array(dialogueSchema).default([]),
});

export type Campaign = z.infer<typeof campaignSchema>;
export type RegistryEntry = z.infer<typeof registryEntrySchema>;
