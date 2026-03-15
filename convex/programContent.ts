import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// ============================================================================
// Return validators
// ============================================================================

const programContentValidator = v.object({
  _id: v.id("program_content"),
  _creationTime: v.number(),
  programId: v.id("training_programs"),
  tenantId: v.id("tenants"),
  week: v.number(),
  day: v.number(),
  workoutDefinitionId: v.optional(v.id("workout_definitions")),
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  notes: v.optional(v.string()),
});

// ============================================================================
// listByProgram — list all content for a program (verify program belongs to tenant)
// ============================================================================

export const listByProgram = tenantQuery({
  args: { programId: v.id("training_programs") },
  returns: v.array(programContentValidator),
  handler: async (ctx, args) => {
    const program = await ctx.db.get(args.programId);
    if (!program || program.tenantId !== ctx.tenantId) {
      throw new ConvexError("Training program not found");
    }

    return await ctx.db
      .query("program_content")
      .withIndex("by_programId", (q) => q.eq("programId", args.programId))
      .collect();
  },
});

// ============================================================================
// getByWeekDay — get content for a specific week/day of a program
// ============================================================================

export const getByWeekDay = tenantQuery({
  args: {
    programId: v.id("training_programs"),
    week: v.number(),
    day: v.number(),
  },
  returns: v.union(programContentValidator, v.null()),
  handler: async (ctx, args) => {
    const program = await ctx.db.get(args.programId);
    if (!program || program.tenantId !== ctx.tenantId) {
      throw new ConvexError("Training program not found");
    }

    return await ctx.db
      .query("program_content")
      .withIndex("by_programId_week_day", (q) =>
        q.eq("programId", args.programId).eq("week", args.week).eq("day", args.day)
      )
      .first();
  },
});

// ============================================================================
// create — create program content (coach+)
// ============================================================================

export const create = tenantMutation({
  args: {
    programId: v.id("training_programs"),
    week: v.number(),
    day: v.number(),
    workoutDefinitionId: v.optional(v.id("workout_definitions")),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("program_content"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const program = await ctx.db.get(args.programId);
    if (!program || program.tenantId !== ctx.tenantId) {
      throw new ConvexError("Training program not found");
    }

    return await ctx.db.insert("program_content", {
      tenantId: ctx.tenantId,
      ...args,
    });
  },
});

// ============================================================================
// update — update program content (coach+)
// ============================================================================

export const update = tenantMutation({
  args: {
    contentId: v.id("program_content"),
    week: v.optional(v.number()),
    day: v.optional(v.number()),
    workoutDefinitionId: v.optional(v.id("workout_definitions")),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const content = await ctx.db.get(args.contentId);
    if (!content || content.tenantId !== ctx.tenantId) {
      throw new ConvexError("Program content not found");
    }

    const { contentId: _id, ...updates } = args;
    await ctx.db.patch(args.contentId, updates);

    return null;
  },
});

// ============================================================================
// remove — delete program content (coach+)
// ============================================================================

export const remove = tenantMutation({
  args: { contentId: v.id("program_content") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const content = await ctx.db.get(args.contentId);
    if (!content || content.tenantId !== ctx.tenantId) {
      throw new ConvexError("Program content not found");
    }

    await ctx.db.delete(args.contentId);
    return null;
  },
});
