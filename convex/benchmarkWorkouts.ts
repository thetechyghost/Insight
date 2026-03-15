import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";
import { workoutTypeValidator, benchmarkCategoryValidator } from "./lib/validators";

// ============================================================================
// Prescribed movement validator
// ============================================================================

const prescribedMovementValidator = v.object({
  exerciseId: v.optional(v.id("exercises")),
  exerciseName: v.string(),
  reps: v.optional(v.number()),
  weight: v.optional(v.object({ value: v.number(), unit: v.string() })),
  distance: v.optional(v.object({ value: v.number(), unit: v.string() })),
  calories: v.optional(v.number()),
});

// ============================================================================
// Scoring method validator
// ============================================================================

const scoringMethodValidator = v.union(
  v.literal("time"),
  v.literal("reps"),
  v.literal("rounds_reps"),
  v.literal("weight"),
  v.literal("distance"),
  v.literal("calories")
);

// ============================================================================
// Benchmark workout return validator
// ============================================================================

const benchmarkReturnValidator = v.object({
  _id: v.id("benchmark_workouts"),
  _creationTime: v.number(),
  tenantId: v.optional(v.id("tenants")),
  name: v.string(),
  description: v.optional(v.string()),
  workoutType: workoutTypeValidator,
  prescribedMovements: v.array(prescribedMovementValidator),
  timeCap: v.optional(v.number()),
  scoringMethod: scoringMethodValidator,
  category: v.optional(benchmarkCategoryValidator),
  intendedStimulus: v.optional(v.string()),
});

// ============================================================================
// list — get platform + tenant benchmarks, optionally filtered by category
// ============================================================================

export const list = tenantQuery({
  args: {
    category: v.optional(benchmarkCategoryValidator),
  },
  returns: v.array(benchmarkReturnValidator),
  handler: async (ctx, args) => {
    const platformBenchmarks = await ctx.db
      .query("benchmark_workouts")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", undefined))
      .collect();

    const tenantBenchmarks = await ctx.db
      .query("benchmark_workouts")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();

    let combined = [...platformBenchmarks, ...tenantBenchmarks];

    if (args.category) {
      combined = combined.filter((b) => b.category === args.category);
    }

    return combined;
  },
});

// ============================================================================
// getById — get a single benchmark workout by ID
// ============================================================================

export const getById = tenantQuery({
  args: {
    benchmarkId: v.id("benchmark_workouts"),
  },
  returns: benchmarkReturnValidator,
  handler: async (ctx, args) => {
    const benchmark = await ctx.db.get(args.benchmarkId);
    if (!benchmark) {
      throw new ConvexError("Benchmark workout not found");
    }

    if (benchmark.tenantId !== undefined && benchmark.tenantId !== ctx.tenantId) {
      throw new ConvexError("Benchmark workout not found");
    }

    return benchmark;
  },
});

// ============================================================================
// create — create a tenant-specific benchmark workout (coach+)
// ============================================================================

export const create = tenantMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    workoutType: workoutTypeValidator,
    prescribedMovements: v.optional(v.array(prescribedMovementValidator)),
    timeCap: v.optional(v.number()),
    scoringMethod: scoringMethodValidator,
    category: v.optional(benchmarkCategoryValidator),
    intendedStimulus: v.optional(v.string()),
  },
  returns: v.id("benchmark_workouts"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    return await ctx.db.insert("benchmark_workouts", {
      tenantId: ctx.tenantId,
      name: args.name,
      description: args.description,
      workoutType: args.workoutType,
      prescribedMovements: args.prescribedMovements ?? [],
      timeCap: args.timeCap,
      scoringMethod: args.scoringMethod,
      category: args.category,
      intendedStimulus: args.intendedStimulus,
    });
  },
});

// ============================================================================
// update — update a tenant-owned benchmark workout (coach+)
// ============================================================================

export const update = tenantMutation({
  args: {
    benchmarkId: v.id("benchmark_workouts"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    workoutType: v.optional(workoutTypeValidator),
    prescribedMovements: v.optional(v.array(prescribedMovementValidator)),
    timeCap: v.optional(v.number()),
    scoringMethod: v.optional(scoringMethodValidator),
    category: v.optional(benchmarkCategoryValidator),
    intendedStimulus: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const benchmark = await ctx.db.get(args.benchmarkId);
    if (!benchmark) {
      throw new ConvexError("Benchmark workout not found");
    }

    if (benchmark.tenantId === undefined) {
      throw new ConvexError("Cannot modify platform benchmark workouts");
    }

    if (benchmark.tenantId !== ctx.tenantId) {
      throw new ConvexError("Benchmark workout not found");
    }

    const { benchmarkId, ...updates } = args;
    await ctx.db.patch(benchmarkId, updates);
    return null;
  },
});
