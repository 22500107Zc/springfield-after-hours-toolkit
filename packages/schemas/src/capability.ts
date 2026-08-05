import { z } from 'zod';
import { IdSchema, ProvenanceRefSchema, VerificationStatusSchema } from './common.js';

/**
 * The capability matrix.
 *
 * This is where the toolkit states, on the record, what it can and cannot do —
 * including the things people commonly assume a "modding toolkit" can do
 * because other games allow them. Anything not proven is listed as
 * `unsupported` or `planned`, with a reason.
 */

export const CapabilitySchema = z.object({
  id: IdSchema,
  title: z.string().min(1),
  /** What someone might expect this to mean. */
  description: z.string().min(1),
  status: VerificationStatusSchema,
  /** Which layer owns it: toolkit, launcher, game, or external. */
  domain: z.enum(['toolkit', 'mod-launcher', 'game', 'external-mod']),
  /** Why the status is what it is. Required for anything not `verified`. */
  rationale: z.string().min(1),
  provenance: ProvenanceRefSchema.optional(),
  notes: z.array(z.string()).default([]),
});

export type Capability = z.infer<typeof CapabilitySchema>;

export const CapabilityMatrixFileSchema = z.object({
  version: z.literal(1),
  description: z.string().min(1),
  capabilities: z.array(CapabilitySchema),
});
