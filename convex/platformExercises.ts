import { v, ConvexError } from "convex/values";
import { platformQuery, platformMutation } from "./lib/platformFunctions";
import { internal } from "./_generated/api";

const exerciseCategoryValidator = v.union(
  v.literal("weightlifting"),
  v.literal("gymnastics"),
  v.literal("monostructural"),
  v.literal("other")
);

const difficultyValidator = v.union(
  v.literal("beginner"),
  v.literal("intermediate"),
  v.literal("advanced"),
  v.literal("elite")
);

// ============================================================================
// list — platform-level exercises (tenantId undefined)
// ============================================================================

export const list = platformQuery({
  args: {
    category: v.optional(exerciseCategoryValidator),
    search: v.optional(v.string()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Platform exercises have no tenantId
    let exercises = await ctx.db
      .query("exercises")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", undefined))
      .collect();

    if (args.category) {
      exercises = exercises.filter((e) => e.category === args.category);
    }
    if (args.search) {
      const search = args.search.toLowerCase();
      exercises = exercises.filter(
        (e) =>
          e.name.toLowerCase().includes(search) ||
          e.aliases?.some((a: string) => a.toLowerCase().includes(search))
      );
    }

    exercises.sort((a, b) => a.name.localeCompare(b.name));
    return exercises;
  },
});

// ============================================================================
// getById — single platform exercise
// ============================================================================

export const getById = platformQuery({
  args: { exerciseId: v.id("exercises") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const exercise = await ctx.db.get(args.exerciseId);
    if (!exercise) throw new ConvexError("Exercise not found");
    if (exercise.tenantId !== undefined) {
      throw new ConvexError("This is a tenant-specific exercise, not a platform exercise");
    }
    return exercise;
  },
});

// ============================================================================
// create — create a platform exercise
// ============================================================================

export const create = platformMutation({
  args: {
    name: v.string(),
    category: exerciseCategoryValidator,
    equipment: v.optional(v.array(v.string())),
    muscleGroups: v.optional(v.array(v.string())),
    instructions: v.optional(v.string()),
    aliases: v.optional(v.array(v.string())),
    difficultyLevel: v.optional(difficultyValidator),
    scalingAlternatives: v.optional(v.array(v.string())),
    progressionPaths: v.optional(v.array(v.string())),
  },
  returns: v.id("exercises"),
  handler: async (ctx, args) => {
    if (!args.name.trim()) {
      throw new ConvexError("Exercise name cannot be empty");
    }

    const exerciseId = await ctx.db.insert("exercises", {
      ...args,
      tenantId: undefined,
    });

    await ctx.scheduler.runAfter(0, internal.platformAuditLog.create, {
      actorId: ctx.userId,
      action: "exercise.created",
      targetEntity: "exercises",
      targetId: exerciseId as string,
      afterValue: { name: args.name, category: args.category },
    });

    return exerciseId;
  },
});

// ============================================================================
// update — update a platform exercise
// ============================================================================

export const update = platformMutation({
  args: {
    exerciseId: v.id("exercises"),
    name: v.optional(v.string()),
    category: v.optional(exerciseCategoryValidator),
    equipment: v.optional(v.array(v.string())),
    muscleGroups: v.optional(v.array(v.string())),
    instructions: v.optional(v.string()),
    aliases: v.optional(v.array(v.string())),
    difficultyLevel: v.optional(difficultyValidator),
    scalingAlternatives: v.optional(v.array(v.string())),
    progressionPaths: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const exercise = await ctx.db.get(args.exerciseId);
    if (!exercise) throw new ConvexError("Exercise not found");
    if (exercise.tenantId !== undefined) {
      throw new ConvexError("Cannot modify tenant-specific exercises from platform admin");
    }

    const { exerciseId, ...patch } = args;
    const cleanPatch = Object.fromEntries(
      Object.entries(patch).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(exerciseId, cleanPatch);

    await ctx.scheduler.runAfter(0, internal.platformAuditLog.create, {
      actorId: ctx.userId,
      action: "exercise.updated",
      targetEntity: "exercises",
      targetId: exerciseId as string,
      beforeValue: { name: exercise.name },
      afterValue: cleanPatch,
    });

    return null;
  },
});

// ============================================================================
// remove — delete a platform exercise
// ============================================================================

export const remove = platformMutation({
  args: { exerciseId: v.id("exercises") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const exercise = await ctx.db.get(args.exerciseId);
    if (!exercise) throw new ConvexError("Exercise not found");
    if (exercise.tenantId !== undefined) {
      throw new ConvexError("Cannot delete tenant-specific exercises from platform admin");
    }

    await ctx.db.delete(args.exerciseId);

    await ctx.scheduler.runAfter(0, internal.platformAuditLog.create, {
      actorId: ctx.userId,
      action: "exercise.deleted",
      targetEntity: "exercises",
      targetId: args.exerciseId as string,
      beforeValue: { name: exercise.name, category: exercise.category },
    });

    return null;
  },
});
