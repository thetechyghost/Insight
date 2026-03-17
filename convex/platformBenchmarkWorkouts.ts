import { v, ConvexError } from "convex/values";
import { platformQuery, platformMutation } from "./lib/platformFunctions";
import { internal } from "./_generated/api";

const benchmarkCategoryValidator = v.optional(
  v.union(v.literal("Hero"), v.literal("Girl"), v.literal("Open"), v.literal("custom"))
);

const scoringMethodValidator = v.union(
  v.literal("time"),
  v.literal("reps"),
  v.literal("rounds_reps"),
  v.literal("weight"),
  v.literal("distance"),
  v.literal("calories")
);

const movementValidator = v.object({
  exerciseId: v.optional(v.id("exercises")),
  exerciseName: v.string(),
  reps: v.optional(v.number()),
  weight: v.optional(v.object({ value: v.number(), unit: v.string() })),
  distance: v.optional(v.object({ value: v.number(), unit: v.string() })),
  calories: v.optional(v.number()),
});

// ============================================================================
// list — platform-level benchmark workouts (tenantId undefined)
// ============================================================================

export const list = platformQuery({
  args: {
    category: benchmarkCategoryValidator,
    search: v.optional(v.string()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    let benchmarks = await ctx.db
      .query("benchmark_workouts")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", undefined))
      .collect();

    if (args.category) {
      benchmarks = benchmarks.filter((b) => b.category === args.category);
    }
    if (args.search) {
      const search = args.search.toLowerCase();
      benchmarks = benchmarks.filter((b) => b.name.toLowerCase().includes(search));
    }

    benchmarks.sort((a, b) => a.name.localeCompare(b.name));
    return benchmarks;
  },
});

// ============================================================================
// getById — single platform benchmark
// ============================================================================

export const getById = platformQuery({
  args: { benchmarkId: v.id("benchmark_workouts") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const benchmark = await ctx.db.get(args.benchmarkId);
    if (!benchmark) throw new ConvexError("Benchmark workout not found");
    if (benchmark.tenantId !== undefined) {
      throw new ConvexError("This is a tenant-specific benchmark, not a platform benchmark");
    }
    return benchmark;
  },
});

// ============================================================================
// create — create a platform benchmark workout
// ============================================================================

export const create = platformMutation({
  args: {
    name: v.string(),
    workoutType: v.string(),
    prescribedMovements: v.array(movementValidator),
    timeCap: v.optional(v.number()),
    scoringMethod: scoringMethodValidator,
    category: benchmarkCategoryValidator,
    description: v.optional(v.string()),
    intendedStimulus: v.optional(v.string()),
  },
  returns: v.id("benchmark_workouts"),
  handler: async (ctx, args) => {
    if (!args.name.trim()) {
      throw new ConvexError("Benchmark name cannot be empty");
    }

    const benchmarkId = await ctx.db.insert("benchmark_workouts", {
      ...args,
      tenantId: undefined,
    });

    await ctx.scheduler.runAfter(0, internal.platformAuditLog.create, {
      actorId: ctx.userId,
      action: "benchmark.created",
      targetEntity: "benchmark_workouts",
      targetId: benchmarkId as string,
      afterValue: { name: args.name, workoutType: args.workoutType },
    });

    return benchmarkId;
  },
});

// ============================================================================
// update — update a platform benchmark
// ============================================================================

export const update = platformMutation({
  args: {
    benchmarkId: v.id("benchmark_workouts"),
    name: v.optional(v.string()),
    workoutType: v.optional(v.string()),
    prescribedMovements: v.optional(v.array(movementValidator)),
    timeCap: v.optional(v.number()),
    scoringMethod: v.optional(scoringMethodValidator),
    category: benchmarkCategoryValidator,
    description: v.optional(v.string()),
    intendedStimulus: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const benchmark = await ctx.db.get(args.benchmarkId);
    if (!benchmark) throw new ConvexError("Benchmark workout not found");
    if (benchmark.tenantId !== undefined) {
      throw new ConvexError("Cannot modify tenant-specific benchmarks from platform admin");
    }

    const { benchmarkId, ...patch } = args;
    const cleanPatch = Object.fromEntries(
      Object.entries(patch).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(benchmarkId, cleanPatch);

    await ctx.scheduler.runAfter(0, internal.platformAuditLog.create, {
      actorId: ctx.userId,
      action: "benchmark.updated",
      targetEntity: "benchmark_workouts",
      targetId: benchmarkId as string,
      beforeValue: { name: benchmark.name },
      afterValue: cleanPatch,
    });

    return null;
  },
});

// ============================================================================
// remove — delete a platform benchmark
// ============================================================================

export const remove = platformMutation({
  args: { benchmarkId: v.id("benchmark_workouts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const benchmark = await ctx.db.get(args.benchmarkId);
    if (!benchmark) throw new ConvexError("Benchmark workout not found");
    if (benchmark.tenantId !== undefined) {
      throw new ConvexError("Cannot delete tenant-specific benchmarks from platform admin");
    }

    await ctx.db.delete(args.benchmarkId);

    await ctx.scheduler.runAfter(0, internal.platformAuditLog.create, {
      actorId: ctx.userId,
      action: "benchmark.deleted",
      targetEntity: "benchmark_workouts",
      targetId: args.benchmarkId as string,
      beforeValue: { name: benchmark.name, category: benchmark.category },
    });

    return null;
  },
});
