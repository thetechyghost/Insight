import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// --- Local validators ---

const sessionStatusValidator = v.union(
  v.literal("scheduled"),
  v.literal("in_progress"),
  v.literal("complete"),
  v.literal("cancelled")
);

// --- Return validator ---

const classSessionValidator = v.object({
  _id: v.id("class_sessions"),
  _creationTime: v.number(),
  classId: v.id("classes"),
  tenantId: v.id("tenants"),
  date: v.string(),
  startTime: v.optional(v.string()),
  coachId: v.optional(v.id("users")),
  workoutDefinitionId: v.optional(v.id("workout_definitions")),
  status: sessionStatusValidator,
  linkedEquipmentSessionIds: v.optional(v.array(v.id("equipment_sessions"))),
});

// ============================================================================
// listByDate — list sessions for a given date
// ============================================================================

export const listByDate = tenantQuery({
  args: {
    date: v.string(),
  },
  returns: v.array(classSessionValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("class_sessions")
      .withIndex("by_tenantId_date", (q) =>
        q.eq("tenantId", ctx.tenantId).eq("date", args.date)
      )
      .collect();
  },
});

// ============================================================================
// getById — get a single class session by ID (coach+)
// ============================================================================

export const getById = tenantQuery({
  args: {
    sessionId: v.id("class_sessions"),
  },
  returns: classSessionValidator,
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.tenantId !== ctx.tenantId) {
      throw new ConvexError("Class session not found");
    }
    return session;
  },
});

// ============================================================================
// create — create a class session (coach+)
// ============================================================================

export const create = tenantMutation({
  args: {
    classId: v.id("classes"),
    date: v.string(),
    startTime: v.optional(v.string()),
    coachId: v.optional(v.id("users")),
    workoutDefinitionId: v.optional(v.id("workout_definitions")),
  },
  returns: v.id("class_sessions"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const cls = await ctx.db.get(args.classId);
    if (!cls || cls.tenantId !== ctx.tenantId) {
      throw new ConvexError("Class not found");
    }

    return await ctx.db.insert("class_sessions", {
      tenantId: ctx.tenantId,
      classId: args.classId,
      date: args.date,
      startTime: args.startTime,
      coachId: args.coachId,
      workoutDefinitionId: args.workoutDefinitionId,
      status: "scheduled",
    });
  },
});

// ============================================================================
// update — update a class session (coach+)
// ============================================================================

export const update = tenantMutation({
  args: {
    sessionId: v.id("class_sessions"),
    date: v.optional(v.string()),
    startTime: v.optional(v.string()),
    status: v.optional(sessionStatusValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.tenantId !== ctx.tenantId) {
      throw new ConvexError("Class session not found");
    }

    const { sessionId: _id, ...updates } = args;
    await ctx.db.patch(args.sessionId, updates);

    return null;
  },
});

// ============================================================================
// cancel — cancel a class session (coach+)
// ============================================================================

export const cancel = tenantMutation({
  args: {
    sessionId: v.id("class_sessions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.tenantId !== ctx.tenantId) {
      throw new ConvexError("Class session not found");
    }

    await ctx.db.patch(args.sessionId, { status: "cancelled" as const });

    return null;
  },
});

// ============================================================================
// assignWorkout — assign a workout definition to a session (coach+)
// ============================================================================

export const assignWorkout = tenantMutation({
  args: {
    sessionId: v.id("class_sessions"),
    workoutDefinitionId: v.id("workout_definitions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.tenantId !== ctx.tenantId) {
      throw new ConvexError("Class session not found");
    }

    await ctx.db.patch(args.sessionId, {
      workoutDefinitionId: args.workoutDefinitionId,
    });

    return null;
  },
});

// ============================================================================
// assignCoach — assign a coach to a session (coach+)
// ============================================================================

export const assignCoach = tenantMutation({
  args: {
    sessionId: v.id("class_sessions"),
    coachId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.tenantId !== ctx.tenantId) {
      throw new ConvexError("Class session not found");
    }

    await ctx.db.patch(args.sessionId, {
      coachId: args.coachId,
    });

    return null;
  },
});
