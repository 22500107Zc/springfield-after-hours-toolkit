import { z } from 'zod';
import { IdSchema, NotesSchema, ReferenceSchema, VerificationStatusSchema } from './common.js';

/**
 * Dialogue authoring.
 *
 * This toolkit does NOT claim to know the game's dialogue binary formats. It
 * stores dialogue structurally, validates it, and exports the formats it can
 * justify. Anything it cannot generate is reported as an explicit remaining
 * manual step rather than silently emitted as a guess.
 */

export const DialogueLineSchema = z.object({
  id: IdSchema,
  /** Order within the conversation. Lower first. */
  order: z.number().int().nonnegative(),
  /** Character record id. Resolved against the character registry. */
  speaker: ReferenceSchema,
  /** The spoken line, as text. */
  text: z.string().min(1),
  /**
   * Path to user-supplied audio, relative to the campaign root.
   *
   * The toolkit never ships or extracts game audio. A missing audio reference
   * is a warning, not an error — text-only dialogue is a legitimate choice.
   */
  audio: z.string().optional(),
  /** Portrait or icon asset record id. */
  portrait: ReferenceSchema.optional(),
  /** Localization key, for projects that maintain their own string tables. */
  localizationKey: z.string().optional(),
  status: VerificationStatusSchema.default('unverified'),
  notes: NotesSchema,
});

export type DialogueLine = z.infer<typeof DialogueLineSchema>;

export const ConversationSchema = z.object({
  id: IdSchema,
  title: z.string().optional(),
  /** Mission this conversation belongs to, if any. */
  mission: IdSchema.optional(),
  /** Stage this conversation belongs to, if any. */
  stage: IdSchema.optional(),
  lines: z.array(DialogueLineSchema).min(1, 'a conversation needs at least one line'),
  status: VerificationStatusSchema.default('unverified'),
  notes: NotesSchema,
});

export type Conversation = z.infer<typeof ConversationSchema>;

export const DialogueFileSchema = z.object({
  version: z.literal(1),
  conversations: z.array(ConversationSchema),
});

export type DialogueFile = z.infer<typeof DialogueFileSchema>;
