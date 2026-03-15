import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// ============================================================================
// Local validators
// ============================================================================

const scopeValidator = v.union(
  v.literal("class"),
  v.literal("gym"),
  v.literal("global")
);

const timeWindowValidator = v.optional(
  v.union(
    v.literal("daily"),
    v.literal("weekly"),
    v.literal("monthly"),
    v.literal("all_time")
  )
);

// ============================================================================
// Return validators
// ============================================================================

const leaderboardValidator = v.object({
  _id: v.id("leaderboards"),
  _creationTime: v.number(),
  scope: scopeValidator,
  workoutRef: v.optional(v.id("workout_definitions")),
  benchmarkRef: v.optional(v.id("benchmark_workouts")),
  timeWindow: timeWindowValidator,
  filters: v.optional(v.any()),
  tenantId: v.optional(v.id("tenants")),
});

// ============================================================================
// list — list leaderboards for this tenant
// ============================================================================

export const list = tenantQuery({
  args: {},
  returns: v.array(leaderboardValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("leaderboards")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
  },
});

// ============================================================================
// getById — get a single leaderboard
// ============================================================================

export const getById = tenantQuery({
  args: { leaderboardId: v.id("leaderboards") },
  returns: leaderboardValidator,
  handler: async (ctx, args) => {
    const leaderboard = await ctx.db.get(args.leaderboardId);
    if (!leaderboard || leaderboard.tenantId !== ctx.tenantId) {
      throw new ConvexError("Leaderboard not found");
    }
    return leaderboard;
  },
});

// ============================================================================
// create — create a new leaderboard (coach+)
// ============================================================================

export const create = tenantMutation({
  args: {
    scope: scopeValidator,
    workoutRef: v.optional(v.id("workout_definitions")),
    benchmarkRef: v.optional(v.id("benchmark_workouts")),
    timeWindow: timeWindowValidator,
    filters: v.optional(v.any()),
  },
  returns: v.id("leaderboards"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    return await ctx.db.insert("leaderboards", {
      scope: args.scope,
      workoutRef: args.workoutRef,
      benchmarkRef: args.benchmarkRef,
      timeWindow: args.timeWindow,
      filters: args.filters,
      tenantId: ctx.tenantId,
    });
  },
});

// ============================================================================
// update — update a leaderboard (coach+)
// ============================================================================

export const update = tenantMutation({
  args: {
    leaderboardId: v.id("leaderboards"),
    scope: v.optional(scopeValidator),
    workoutRef: v.optional(v.id("workout_definitions")),
    benchmarkRef: v.optional(v.id("benchmark_workouts")),
    timeWindow: timeWindowValidator,
    filters: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const leaderboard = await ctx.db.get(args.leaderboardId);
    if (!leaderboard || leaderboard.tenantId !== ctx.tenantId) {
      throw new ConvexError("Leaderboard not found");
    }

    const { leaderboardId: _id, ...updates } = args;
    await ctx.db.patch(args.leaderboardId, updates);
    return null;
  },
});

// ============================================================================
// remove — delete a leaderboard (coach+)
// ============================================================================

export const remove = tenantMutation({
  args: { leaderboardId: v.id("leaderboards") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const leaderboard = await ctx.db.get(args.leaderboardId);
    if (!leaderboard || leaderboard.tenantId !== ctx.tenantId) {
      throw new ConvexError("Leaderboard not found");
    }

    await ctx.db.delete(args.leaderboardId);
    return null;
  },
});
