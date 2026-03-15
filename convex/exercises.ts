import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";
import { exerciseCategoryValidator, difficultyLevelValidator } from "./lib/validators";

// ============================================================================
// Exercise return validator
// ============================================================================

const exerciseReturnValidator = v.object({
  _id: v.id("exercises"),
  _creationTime: v.number(),
  tenantId: v.optional(v.id("tenants")),
  name: v.string(),
  category: exerciseCategoryValidator,
  equipment: v.optional(v.array(v.string())),
  muscleGroups: v.optional(v.array(v.string())),
  aliases: v.optional(v.array(v.string())),
  demoVideoStorageId: v.optional(v.id("_storage")),
  demoVideoUrl: v.optional(v.string()),
  instructions: v.optional(v.string()),
  difficultyLevel: v.optional(difficultyLevelValidator),
  scalingAlternatives: v.optional(v.array(v.id("exercises"))),
  progressionPaths: v.optional(v.array(v.id("exercises"))),
});

// ============================================================================
// list — get platform + tenant exercises, optionally filtered by category
// ============================================================================

export const list = tenantQuery({
  args: {
    category: v.optional(exerciseCategoryValidator),
  },
  returns: v.array(exerciseReturnValidator),
  handler: async (ctx, args) => {
    const platformExercises = await ctx.db
      .query("exercises")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", undefined))
      .collect();

    const tenantExercises = await ctx.db
      .query("exercises")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();

    let combined = [...platformExercises, ...tenantExercises];

    if (args.category) {
      combined = combined.filter((e) => e.category === args.category);
    }

    return combined;
  },
});

// ============================================================================
// search — search exercises by name or aliases (max 20 results)
// ============================================================================

export const search = tenantQuery({
  args: {
    query: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("exercises"),
      name: v.string(),
      category: exerciseCategoryValidator,
    })
  ),
  handler: async (ctx, args) => {
    const platformExercises = await ctx.db
      .query("exercises")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", undefined))
      .collect();

    const tenantExercises = await ctx.db
      .query("exercises")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();

    const all = [...platformExercises, ...tenantExercises];
    const queryLower = args.query.toLowerCase();

    const matches = all.filter((e) => {
      if (e.name.toLowerCase().includes(queryLower)) return true;
      if (e.aliases?.some((a) => a.toLowerCase().includes(queryLower))) return true;
      return false;
    });

    return matches.slice(0, 20).map((e) => ({
      _id: e._id,
      name: e.name,
      category: e.category,
    }));
  },
});

// ============================================================================
// getById — get a single exercise by ID
// ============================================================================

export const getById = tenantQuery({
  args: {
    exerciseId: v.id("exercises"),
  },
  returns: exerciseReturnValidator,
  handler: async (ctx, args) => {
    const exercise = await ctx.db.get(args.exerciseId);
    if (!exercise) {
      throw new ConvexError("Exercise not found");
    }

    if (exercise.tenantId !== undefined && exercise.tenantId !== ctx.tenantId) {
      throw new ConvexError("Exercise not found");
    }

    return exercise;
  },
});

// ============================================================================
// create — create a tenant-specific exercise (coach+)
// ============================================================================

export const create = tenantMutation({
  args: {
    name: v.string(),
    category: exerciseCategoryValidator,
    equipment: v.optional(v.array(v.string())),
    muscleGroups: v.optional(v.array(v.string())),
    aliases: v.optional(v.array(v.string())),
    instructions: v.optional(v.string()),
    difficultyLevel: v.optional(difficultyLevelValidator),
    scalingAlternatives: v.optional(v.array(v.id("exercises"))),
    progressionPaths: v.optional(v.array(v.id("exercises"))),
  },
  returns: v.id("exercises"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    return await ctx.db.insert("exercises", {
      tenantId: ctx.tenantId,
      name: args.name,
      category: args.category,
      equipment: args.equipment,
      muscleGroups: args.muscleGroups,
      aliases: args.aliases,
      instructions: args.instructions,
      difficultyLevel: args.difficultyLevel,
      scalingAlternatives: args.scalingAlternatives,
      progressionPaths: args.progressionPaths,
    });
  },
});

// ============================================================================
// update — update a tenant-owned exercise (coach+)
// ============================================================================

export const update = tenantMutation({
  args: {
    exerciseId: v.id("exercises"),
    name: v.optional(v.string()),
    category: v.optional(exerciseCategoryValidator),
    equipment: v.optional(v.array(v.string())),
    muscleGroups: v.optional(v.array(v.string())),
    aliases: v.optional(v.array(v.string())),
    instructions: v.optional(v.string()),
    difficultyLevel: v.optional(difficultyLevelValidator),
    scalingAlternatives: v.optional(v.array(v.id("exercises"))),
    progressionPaths: v.optional(v.array(v.id("exercises"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const exercise = await ctx.db.get(args.exerciseId);
    if (!exercise) {
      throw new ConvexError("Exercise not found");
    }

    if (exercise.tenantId === undefined) {
      throw new ConvexError("Cannot modify platform exercises");
    }

    if (exercise.tenantId !== ctx.tenantId) {
      throw new ConvexError("Exercise not found");
    }

    const { exerciseId, ...updates } = args;
    await ctx.db.patch(exerciseId, updates);
    return null;
  },
});

// ============================================================================
// remove — delete a tenant-owned exercise (coach+)
// ============================================================================

export const remove = tenantMutation({
  args: {
    exerciseId: v.id("exercises"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const exercise = await ctx.db.get(args.exerciseId);
    if (!exercise) {
      throw new ConvexError("Exercise not found");
    }

    if (exercise.tenantId === undefined) {
      throw new ConvexError("Cannot delete platform exercises");
    }

    if (exercise.tenantId !== ctx.tenantId) {
      throw new ConvexError("Exercise not found");
    }

    await ctx.db.delete(args.exerciseId);
    return null;
  },
});
