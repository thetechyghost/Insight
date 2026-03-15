import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";
import { workoutTypeValidator } from "./lib/validators";

// --- Local validators ---

const componentValidator = v.object({
  exerciseId: v.optional(v.id("exercises")),
  exerciseName: v.string(),
  reps: v.optional(v.number()),
  sets: v.optional(v.number()),
  weight: v.optional(v.object({ value: v.number(), unit: v.string() })),
  distance: v.optional(v.object({ value: v.number(), unit: v.string() })),
  duration: v.optional(v.number()),
  calories: v.optional(v.number()),
  notes: v.optional(v.string()),
  order: v.number(),
});

const scalingOptionValidator = v.object({
  level: v.string(),
  description: v.string(),
});

// --- Return type validator ---

const workoutDefinitionValidator = v.object({
  _id: v.id("workout_definitions"),
  _creationTime: v.number(),
  tenantId: v.optional(v.id("tenants")),
  name: v.optional(v.string()),
  description: v.optional(v.string()),
  workoutType: workoutTypeValidator,
  components: v.array(componentValidator),
  timeCap: v.optional(v.number()),
  rounds: v.optional(v.number()),
  intervalDuration: v.optional(v.number()),
  restBetweenRounds: v.optional(v.number()),
  scalingOptions: v.optional(v.array(scalingOptionValidator)),
  intendedStimulus: v.optional(v.string()),
  scalingGuidance: v.optional(v.string()),
  warmUpRef: v.optional(v.id("workout_definitions")),
  coolDownRef: v.optional(v.id("workout_definitions")),
  movementDemoVideoStorageIds: v.optional(v.array(v.id("_storage"))),
  createdBy: v.optional(v.id("users")),
});

// ============================================================================
// list — list workout definitions, optionally filtered by type
// ============================================================================

export const list = tenantQuery({
  args: {
    workoutType: v.optional(workoutTypeValidator),
  },
  returns: v.array(workoutDefinitionValidator),
  handler: async (ctx, args) => {
    if (args.workoutType !== undefined) {
      return await ctx.db
        .query("workout_definitions")
        .withIndex("by_tenantId_workoutType", (q) =>
          q.eq("tenantId", ctx.tenantId).eq("workoutType", args.workoutType!)
        )
        .collect();
    }

    return await ctx.db
      .query("workout_definitions")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
  },
});

// ============================================================================
// getById — get a single workout definition by ID
// ============================================================================

export const getById = tenantQuery({
  args: {
    workoutDefinitionId: v.id("workout_definitions"),
  },
  returns: workoutDefinitionValidator,
  handler: async (ctx, args) => {
    const definition = await ctx.db.get(args.workoutDefinitionId);
    if (!definition || definition.tenantId !== ctx.tenantId) {
      throw new ConvexError("Workout definition not found");
    }
    return definition;
  },
});

// ============================================================================
// getByCreator — list workout definitions by creator (defaults to self)
// ============================================================================

export const getByCreator = tenantQuery({
  args: {
    creatorId: v.optional(v.id("users")),
  },
  returns: v.array(workoutDefinitionValidator),
  handler: async (ctx, args) => {
    const targetCreatorId = args.creatorId ?? ctx.userId;

    const results = await ctx.db
      .query("workout_definitions")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", targetCreatorId))
      .collect();

    return results.filter((d) => d.tenantId === ctx.tenantId);
  },
});

// ============================================================================
// create — create a workout definition (coach+)
// ============================================================================

export const create = tenantMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    workoutType: workoutTypeValidator,
    components: v.optional(v.array(componentValidator)),
    timeCap: v.optional(v.number()),
    rounds: v.optional(v.number()),
    intervalDuration: v.optional(v.number()),
    restBetweenRounds: v.optional(v.number()),
    scalingOptions: v.optional(v.array(scalingOptionValidator)),
    intendedStimulus: v.optional(v.string()),
    scalingGuidance: v.optional(v.string()),
  },
  returns: v.id("workout_definitions"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const { components, ...rest } = args;
    return await ctx.db.insert("workout_definitions", {
      tenantId: ctx.tenantId,
      createdBy: ctx.userId,
      components: components ?? [],
      ...rest,
    });
  },
});

// ============================================================================
// update — update a workout definition (coach+)
// ============================================================================

export const update = tenantMutation({
  args: {
    workoutDefinitionId: v.id("workout_definitions"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    workoutType: v.optional(workoutTypeValidator),
    components: v.optional(v.array(componentValidator)),
    timeCap: v.optional(v.number()),
    rounds: v.optional(v.number()),
    intervalDuration: v.optional(v.number()),
    restBetweenRounds: v.optional(v.number()),
    scalingOptions: v.optional(v.array(scalingOptionValidator)),
    intendedStimulus: v.optional(v.string()),
    scalingGuidance: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const definition = await ctx.db.get(args.workoutDefinitionId);
    if (!definition || definition.tenantId !== ctx.tenantId) {
      throw new ConvexError("Workout definition not found");
    }

    const { workoutDefinitionId: _id, ...updates } = args;
    await ctx.db.patch(args.workoutDefinitionId, updates);

    return null;
  },
});

// ============================================================================
// duplicate — duplicate a workout definition (coach+)
// ============================================================================

export const duplicate = tenantMutation({
  args: {
    workoutDefinitionId: v.id("workout_definitions"),
  },
  returns: v.id("workout_definitions"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const original = await ctx.db.get(args.workoutDefinitionId);
    if (!original || original.tenantId !== ctx.tenantId) {
      throw new ConvexError("Workout definition not found");
    }

    const { _id, _creationTime, createdBy, name, ...rest } = original;

    return await ctx.db.insert("workout_definitions", {
      ...rest,
      name: name + " (Copy)",
      createdBy: ctx.userId,
    });
  },
});
