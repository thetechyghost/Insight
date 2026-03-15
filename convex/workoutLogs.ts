import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";
import { workoutTypeValidator, scalingDesignationValidator } from "./lib/validators";

// ============================================================================
// Return validators
// ============================================================================

const workoutLogValidator = v.object({
  _id: v.id("workout_logs"),
  _creationTime: v.number(),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  workoutDefinitionId: v.optional(v.id("workout_definitions")),
  benchmarkWorkoutId: v.optional(v.id("benchmark_workouts")),
  date: v.string(),
  workoutType: workoutTypeValidator,
  scalingDesignation: v.optional(scalingDesignationValidator),
  rpe: v.optional(v.number()),
  notes: v.optional(v.string()),
  isDraft: v.boolean(),
  idempotencyKey: v.optional(v.string()),
});

const previousScoreValidator = v.object({
  date: v.string(),
  scalingDesignation: v.optional(scalingDesignationValidator),
  rpe: v.optional(v.number()),
  notes: v.optional(v.string()),
});

// ============================================================================
// listMine — list the current user's workout logs, optionally filtered by date
// ============================================================================

export const listMine = tenantQuery({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  returns: v.array(workoutLogValidator),
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("workout_logs")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .collect();

    let filtered = logs;
    if (args.startDate !== undefined) {
      filtered = filtered.filter((l) => l.date >= args.startDate!);
    }
    if (args.endDate !== undefined) {
      filtered = filtered.filter((l) => l.date <= args.endDate!);
    }

    filtered.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
    return filtered;
  },
});

// ============================================================================
// getById — get a single workout log by ID
// ============================================================================

export const getById = tenantQuery({
  args: { logId: v.id("workout_logs") },
  returns: workoutLogValidator,
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.logId);
    if (!log) {
      throw new ConvexError("Workout log not found");
    }
    if (log.tenantId !== ctx.tenantId) {
      throw new ConvexError("Workout log does not belong to this tenant");
    }
    return log;
  },
});

// ============================================================================
// getByDate — get the current user's workout logs for a specific date
// ============================================================================

export const getByDate = tenantQuery({
  args: { date: v.string() },
  returns: v.array(workoutLogValidator),
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("workout_logs")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", ctx.userId).eq("date", args.date)
      )
      .collect();

    return logs.filter((l) => l.tenantId === ctx.tenantId);
  },
});

// ============================================================================
// getDrafts — get the current user's draft workout logs
// ============================================================================

export const getDrafts = tenantQuery({
  args: {},
  returns: v.array(workoutLogValidator),
  handler: async (ctx) => {
    const logs = await ctx.db
      .query("workout_logs")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .collect();

    return logs.filter((l) => l.isDraft === true);
  },
});

// ============================================================================
// getPreviousScores — find previous logs for the same workout definition or benchmark
// ============================================================================

export const getPreviousScores = tenantQuery({
  args: {
    workoutDefinitionId: v.optional(v.id("workout_definitions")),
    benchmarkWorkoutId: v.optional(v.id("benchmark_workouts")),
  },
  returns: v.array(previousScoreValidator),
  handler: async (ctx, args) => {
    if (!args.workoutDefinitionId && !args.benchmarkWorkoutId) {
      return [];
    }

    let logs;
    if (args.workoutDefinitionId) {
      logs = await ctx.db
        .query("workout_logs")
        .withIndex("by_workoutDefinitionId", (q) =>
          q.eq("workoutDefinitionId", args.workoutDefinitionId!)
        )
        .collect();
    } else {
      logs = await ctx.db
        .query("workout_logs")
        .withIndex("by_userId_tenantId", (q) =>
          q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
        )
        .collect();
    }

    const filtered = logs.filter(
      (l) =>
        l.userId === ctx.userId &&
        l.tenantId === ctx.tenantId &&
        (args.workoutDefinitionId
          ? l.workoutDefinitionId === args.workoutDefinitionId
          : l.benchmarkWorkoutId === args.benchmarkWorkoutId)
    );

    return filtered.map((l) => ({
      date: l.date,
      scalingDesignation: l.scalingDesignation,
      rpe: l.rpe,
      notes: l.notes,
    }));
  },
});

// ============================================================================
// listByUser — list workout logs for a specific user (coach+)
// ============================================================================

export const listByUser = tenantQuery({
  args: { userId: v.id("users") },
  returns: v.array(workoutLogValidator),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    return await ctx.db
      .query("workout_logs")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", args.userId).eq("tenantId", ctx.tenantId)
      )
      .collect();
  },
});

// ============================================================================
// create — create a new workout log
// ============================================================================

export const create = tenantMutation({
  args: {
    workoutDefinitionId: v.optional(v.id("workout_definitions")),
    benchmarkWorkoutId: v.optional(v.id("benchmark_workouts")),
    date: v.string(),
    workoutType: workoutTypeValidator,
    scalingDesignation: v.optional(scalingDesignationValidator),
    rpe: v.optional(v.number()),
    notes: v.optional(v.string()),
    isDraft: v.boolean(),
    idempotencyKey: v.optional(v.string()),
  },
  returns: v.id("workout_logs"),
  handler: async (ctx, args) => {
    // Idempotency check
    if (args.idempotencyKey) {
      const existing = await ctx.db
        .query("workout_logs")
        .withIndex("by_idempotencyKey", (q) =>
          q.eq("idempotencyKey", args.idempotencyKey!)
        )
        .first();
      if (existing) {
        return existing._id;
      }
    }

    return await ctx.db.insert("workout_logs", {
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      workoutDefinitionId: args.workoutDefinitionId,
      benchmarkWorkoutId: args.benchmarkWorkoutId,
      date: args.date,
      workoutType: args.workoutType,
      scalingDesignation: args.scalingDesignation,
      rpe: args.rpe,
      notes: args.notes,
      isDraft: args.isDraft,
      idempotencyKey: args.idempotencyKey,
    });
  },
});

// ============================================================================
// saveDraft — create or update a draft workout log
// ============================================================================

export const saveDraft = tenantMutation({
  args: {
    logId: v.optional(v.id("workout_logs")),
    workoutDefinitionId: v.optional(v.id("workout_definitions")),
    benchmarkWorkoutId: v.optional(v.id("benchmark_workouts")),
    date: v.string(),
    workoutType: workoutTypeValidator,
    scalingDesignation: v.optional(scalingDesignationValidator),
    rpe: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.id("workout_logs"),
  handler: async (ctx, args) => {
    if (args.logId) {
      const existing = await ctx.db.get(args.logId);
      if (!existing || existing.userId !== ctx.userId || existing.tenantId !== ctx.tenantId) {
        throw new ConvexError("Workout log not found");
      }

      await ctx.db.patch(args.logId, {
        workoutDefinitionId: args.workoutDefinitionId,
        benchmarkWorkoutId: args.benchmarkWorkoutId,
        date: args.date,
        workoutType: args.workoutType,
        scalingDesignation: args.scalingDesignation,
        rpe: args.rpe,
        notes: args.notes,
      });
      return args.logId;
    }

    return await ctx.db.insert("workout_logs", {
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      workoutDefinitionId: args.workoutDefinitionId,
      benchmarkWorkoutId: args.benchmarkWorkoutId,
      date: args.date,
      workoutType: args.workoutType,
      scalingDesignation: args.scalingDesignation,
      rpe: args.rpe,
      notes: args.notes,
      isDraft: true,
    });
  },
});

// ============================================================================
// finalize — mark a draft workout log as finalized
// ============================================================================

export const finalize = tenantMutation({
  args: { logId: v.id("workout_logs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.logId);
    if (!log || log.userId !== ctx.userId || log.tenantId !== ctx.tenantId) {
      throw new ConvexError("Workout log not found");
    }

    await ctx.db.patch(args.logId, { isDraft: false });
    return null;
  },
});

// ============================================================================
// update — update a workout log (owner only)
// ============================================================================

export const update = tenantMutation({
  args: {
    logId: v.id("workout_logs"),
    workoutDefinitionId: v.optional(v.id("workout_definitions")),
    benchmarkWorkoutId: v.optional(v.id("benchmark_workouts")),
    date: v.optional(v.string()),
    workoutType: v.optional(workoutTypeValidator),
    scalingDesignation: v.optional(scalingDesignationValidator),
    rpe: v.optional(v.number()),
    notes: v.optional(v.string()),
    isDraft: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.logId);
    if (!log || log.userId !== ctx.userId || log.tenantId !== ctx.tenantId) {
      throw new ConvexError("Workout log not found");
    }

    const updates: Record<string, unknown> = {};
    if (args.workoutDefinitionId !== undefined) updates.workoutDefinitionId = args.workoutDefinitionId;
    if (args.benchmarkWorkoutId !== undefined) updates.benchmarkWorkoutId = args.benchmarkWorkoutId;
    if (args.date !== undefined) updates.date = args.date;
    if (args.workoutType !== undefined) updates.workoutType = args.workoutType;
    if (args.scalingDesignation !== undefined) updates.scalingDesignation = args.scalingDesignation;
    if (args.rpe !== undefined) updates.rpe = args.rpe;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.isDraft !== undefined) updates.isDraft = args.isDraft;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.logId, updates);
    }

    return null;
  },
});

// ============================================================================
// remove — delete a workout log (owner only)
// ============================================================================

export const remove = tenantMutation({
  args: { logId: v.id("workout_logs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.logId);
    if (!log || log.userId !== ctx.userId || log.tenantId !== ctx.tenantId) {
      throw new ConvexError("Workout log not found");
    }

    await ctx.db.delete(args.logId);
    return null;
  },
});
