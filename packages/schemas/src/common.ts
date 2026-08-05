import { SOURCE_TYPES, VERIFICATION_STATUSES } from '@sah/core';
import { z } from 'zod';

/**
 * Identifiers are lower-kebab-case. They appear in filenames, Lua identifiers
 * and INI keys, so the character set is deliberately narrow.
 */
export const IdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'must be lower-kebab-case (letters, digits and single hyphens)',
  );

export const VerificationStatusSchema = z.enum(VERIFICATION_STATUSES);
export const SourceTypeSchema = z.enum(SOURCE_TYPES);

export const ProvenanceRefSchema = z.object({
  sources: z.array(z.string().min(1)).min(1, 'at least one source id is required'),
  detail: z.string().optional(),
});

export const ProvenanceSourceSchema = z.object({
  id: z.string().min(1),
  type: SourceTypeSchema,
  title: z.string().min(1),
  url: z.string().url().optional(),
  publisher: z.string().optional(),
  commit: z.string().optional(),
  path: z.string().optional(),
  retrievedAt: z.string().optional(),
  license: z.string().optional(),
  notes: z.string().optional(),
});

export const ProvenanceFileSchema = z.object({
  version: z.literal(1),
  sources: z.array(ProvenanceSourceSchema),
});

/**
 * A reference to a registry record.
 *
 * The plain-string form is the common case. The object form exists so an
 * author can explicitly accept a record the toolkit would otherwise refuse to
 * build — that acceptance is recorded in the build manifest.
 */
export const ReferenceSchema = z.union([
  IdSchema,
  z.object({
    ref: IdSchema,
    /**
     * Build even though the referenced record is not `verified` or
     * `experimental`. Produces a prominent warning and a manifest entry.
     */
    allowUnverified: z.literal(true),
    /** Why the author is accepting the risk. Required, to force a moment of thought. */
    reason: z.string().min(1),
  }),
]);

export type Reference = z.infer<typeof ReferenceSchema>;

export function referenceId(reference: Reference): string {
  return typeof reference === 'string' ? reference : reference.ref;
}

export function referenceAllowsUnverified(reference: Reference): boolean {
  return typeof reference !== 'string' && reference.allowUnverified;
}

export function referenceReason(reference: Reference): string | undefined {
  return typeof reference === 'string' ? undefined : reference.reason;
}

/** Free-form notes authors leave for themselves and for reviewers. */
export const NotesSchema = z.array(z.string()).optional();

export const SemverishSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+(?:[-+].*)?$/, 'must look like 1.2.3');
