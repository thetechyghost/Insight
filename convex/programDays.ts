import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// --- Return validator ---

const programDayValidator = v.object({
  _id: v.id("program_days"),
  _creationTime: v.number(),
  programId: v.id("programs_coach"),
  dayNumber: v.number(),
  weekNumber: v.number(),
  workoutDefinitionId: v.optional(v.id("workout_definitions")),
  coachNotes: v.optional(v.string()),
  intendedStimulus: v.optional(v.string()),
  scalingGuidance: v.optional(v.string()),
  warmUp: v.optional(v.string()),
  coolDown: v.optional(v.string()),
});

// ============================================================================
// listByProgram — list all days for a program (verify tenant ownership)
// ============================================================================

export const listByProgram = tenantQuery({
  args: {
    programId: v.id("programs_coach"),
  },
  returns: v.array(programDayValidator),
  handler: async (ctx, args) => {
    const program = await ctx.db.get(args.programId);
    if (!program || program.tenantId !== ctx.tenantId) {
      throw new ConvexError("Program not found");
    }

    return await ctx.db
      .query("program_days")
      .withIndex("by_programId", (q) => q.eq("programId", args.programId))
      .collect();
  },
});

// ============================================================================
// getByWeekDay — get a specific day by program, week, and day number
// ============================================================================

export const getByWeekDay = tenantQuery({
  args: {
    programId: v.id("programs_coach"),
    weekNumber: v.number(),
    dayNumber: v.number(),
  },
  returns: v.union(programDayValidator, v.null()),
  handler: async (ctx, args) => {
    const program = await ctx.db.get(args.programId);
    if (!program || program.tenantId !== ctx.tenantId) {
      throw new ConvexError("Program not found");
    }

    const day = await ctx.db
      .query("program_days")
      .withIndex("by_programId_week_day", (q) =>
        q
          .eq("programId", args.programId)
          .eq("weekNumber", args.weekNumber)
          .eq("dayNumber", args.dayNumber)
      )
      .first();

    return day;
  },
});

// ============================================================================
// create — create a program day (coach+)
// ============================================================================

export const create = tenantMutation({
  args: {
    programId: v.id("programs_coach"),
    dayNumber: v.number(),
    weekNumber: v.number(),
    workoutDefinitionId: v.optional(v.id("workout_definitions")),
    coachNotes: v.optional(v.string()),
    intendedStimulus: v.optional(v.string()),
    scalingGuidance: v.optional(v.string()),
    warmUp: v.optional(v.string()),
    coolDown: v.optional(v.string()),
  },
  returns: v.id("program_days"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const program = await ctx.db.get(args.programId);
    if (!program || program.tenantId !== ctx.tenantId) {
      throw new ConvexError("Program not found");
    }

    return await ctx.db.insert("program_days", args);
  },
});

// ============================================================================
// update — update a program day (coach+)
// ============================================================================

export const update = tenantMutation({
  args: {
    dayId: v.id("program_days"),
    dayNumber: v.optional(v.number()),
    weekNumber: v.optional(v.number()),
    workoutDefinitionId: v.optional(v.id("workout_definitions")),
    coachNotes: v.optional(v.string()),
    intendedStimulus: v.optional(v.string()),
    scalingGuidance: v.optional(v.string()),
    warmUp: v.optional(v.string()),
    coolDown: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const day = await ctx.db.get(args.dayId);
    if (!day) {
      throw new ConvexError("Program day not found");
    }

    const program = await ctx.db.get(day.programId);
    if (!program || program.tenantId !== ctx.tenantId) {
      throw new ConvexError("Program not found");
    }

    const { dayId: _id, ...updates } = args;
    await ctx.db.patch(args.dayId, updates);

    return null;
  },
});

// ============================================================================
// remove — delete a program day (coach+)
// ============================================================================

export const remove = tenantMutation({
  args: {
    dayId: v.id("program_days"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const day = await ctx.db.get(args.dayId);
    if (!day) {
      throw new ConvexError("Program day not found");
    }

    const program = await ctx.db.get(day.programId);
    if (!program || program.tenantId !== ctx.tenantId) {
      throw new ConvexError("Program not found");
    }

    await ctx.db.delete(args.dayId);

    return null;
  },
});

// ============================================================================
// bulkUpdate — update multiple program days at once (coach+)
// ============================================================================

export const bulkUpdate = tenantMutation({
  args: {
    updates: v.array(
      v.object({
        dayId: v.id("program_days"),
        dayNumber: v.optional(v.number()),
        weekNumber: v.optional(v.number()),
        coachNotes: v.optional(v.string()),
        intendedStimulus: v.optional(v.string()),
        warmUp: v.optional(v.string()),
        coolDown: v.optional(v.string()),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    for (const update of args.updates) {
      const day = await ctx.db.get(update.dayId);
      if (!day) {
        throw new ConvexError(`Program day ${update.dayId} not found`);
      }

      const program = await ctx.db.get(day.programId);
      if (!program || program.tenantId !== ctx.tenantId) {
        throw new ConvexError("Program not found");
      }

      const { dayId: _id, ...patches } = update;
      await ctx.db.patch(update.dayId, patches);
    }

    return null;
  },
});
