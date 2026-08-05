import { z } from 'zod';
import { IdSchema, NotesSchema, ReferenceSchema, VerificationStatusSchema } from './common.js';

/**
 * Missions, stages and objectives.
 *
 * IMPORTANT: the field names below are the *toolkit's* authoring model. They
 * are not a claim about the game's own data layout. The compiler maps them onto
 * verified Game.lua calls, and refuses to emit anything it cannot map.
 */

/**
 * Objective kinds the authoring model exposes.
 *
 * The *names* come from Donut Team's documented objective list. Their
 * parameters are largely undocumented upstream (most objective pages read
 * "TODO"), so the registry records each objective's own verification status and
 * the compiler only emits the ones it can map with confidence.
 */
export const ObjectiveSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('goto'),
    /** A location or locator record id. */
    destination: ReferenceSchema,
    notes: NotesSchema,
  }),
  z.object({
    type: z.literal('talkto'),
    /** Character record id of the NPC to talk to. */
    character: ReferenceSchema,
    /** Locator the NPC is placed at. */
    locator: ReferenceSchema.optional(),
    /** Conversation to play, if any. */
    conversation: IdSchema.optional(),
    notes: NotesSchema,
  }),
  z.object({
    type: z.literal('dialogue'),
    conversation: IdSchema,
    notes: NotesSchema,
  }),
  z.object({
    type: z.literal('getin'),
    vehicle: ReferenceSchema,
    notes: NotesSchema,
  }),
  z.object({
    type: z.literal('race'),
    destination: ReferenceSchema.optional(),
    laps: z.number().int().positive().optional(),
    notes: NotesSchema,
  }),
  z.object({
    type: z.literal('timer'),
    seconds: z.number().positive(),
    notes: NotesSchema,
  }),
  z.object({
    /**
     * The documented no-op objective. Game.lua's own README uses
     * `AddObjective("dummy")`, which makes it the only objective this toolkit
     * can emit with full confidence and no unverified parameters.
     */
    type: z.literal('dummy'),
    notes: NotesSchema,
  }),
  z.object({
    /**
     * Escape hatch for an objective the authoring model does not model yet.
     * Requires the raw opt-in on the mission, and every argument is validated
     * against the command registry before emission.
     */
    type: z.literal('raw'),
    /** Objective name passed to AddObjective. */
    objective: z.string().min(1),
    /** Additional verified Game.* calls emitted inside the objective. */
    commands: z
      .array(
        z.object({
          command: z.string().min(1),
          args: z.array(z.union([z.string(), z.number(), z.boolean()])).default([]),
        }),
      )
      .default([]),
    notes: NotesSchema,
  }),
]);

export type Objective = z.infer<typeof ObjectiveSchema>;

export const ConditionSchema = z.object({
  /** Condition name from the documented condition list. */
  type: z.string().min(1),
  args: z.array(z.union([z.string(), z.number(), z.boolean()])).default([]),
  notes: NotesSchema,
});

export const StageSchema = z.object({
  id: IdSchema,
  /** Shown in the mission list; purely informational for authors. */
  title: z.string().optional(),
  objective: ObjectiveSchema,
  conditions: z.array(ConditionSchema).default([]),
  /** HUD icon record id. */
  hudIcon: ReferenceSchema.optional(),
  /** Index into the game's stage message table. */
  stageMessageIndex: z.number().int().nonnegative().optional(),
  /** Stage time limit in seconds. */
  timeLimitSeconds: z.number().positive().optional(),
  /** Emit RESET_TO_HERE at the top of this stage. */
  resetToHere: z.boolean().default(false),
  /** Stage id the campaign expects to follow this one. Checked statically. */
  nextStage: IdSchema.optional(),
  /** Verified raw Game.* calls, emitted inside the stage. Requires opt-in. */
  rawCommands: z
    .array(
      z.object({
        command: z.string().min(1),
        args: z.array(z.union([z.string(), z.number(), z.boolean()])).default([]),
      }),
    )
    .default([]),
  notes: NotesSchema,
});

export type Stage = z.infer<typeof StageSchema>;

export const MissionSchema = z.object({
  id: IdSchema,
  title: z.string().min(1),
  /** Mission name written into the generated Lua, e.g. "m0". */
  gameMissionName: z
    .string()
    .regex(/^[A-Za-z0-9_]{1,31}$/, 'must be a short alphanumeric script name such as "m0"'),
  /** Level record id the mission belongs to. */
  level: ReferenceSchema,
  /** Playable character record id. */
  player: ReferenceSchema.optional(),
  /** Vehicle the player starts the mission in. */
  startingVehicle: ReferenceSchema.optional(),
  /** Locator the player's car is reset to. Maps to SetMissionResetPlayerInCar. */
  resetPlayerInCarLocator: ReferenceSchema.optional(),
  /** Dyna load data string. Passed through to SetDynaLoadData verbatim. */
  dynaLoadData: z.string().optional(),
  /** Ped group index. Maps to UsePedGroup. */
  pedGroup: z.number().int().nonnegative().optional(),
  stages: z.array(StageSchema).min(1, 'a mission needs at least one stage'),
  /** Launcher hacks this mission requires, by registry id. */
  requiredHacks: z.array(ReferenceSchema).default([]),
  /**
   * Opt-in required before any `raw` objective or `rawCommands` entry is
   * emitted. Without it, raw usage is a validation error.
   */
  allowRawGameCommands: z.boolean().default(false),
  /** Author's own assessment of whether this mission is playable. */
  status: VerificationStatusSchema.default('unverified'),
  notes: NotesSchema,
});

export type Mission = z.infer<typeof MissionSchema>;

export const MissionFileSchema = z.object({
  version: z.literal(1),
  mission: MissionSchema,
});
