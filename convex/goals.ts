import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// ============================================================================
// Local validators
// ============================================================================

const goalTypeValidator = v.union(
  v.literal("strength"),
  v.literal("body_comp"),
  v.literal("endurance"),
  v.literal("consistency"),
  v.literal("skill")
);

const goalStatusValidator = v.union(
  v.literal("active"),
  v.literal("completed"),
  v.literal("abandoned")
);

// ============================================================================
// Return validators
// ============================================================================

const goalValidator = v.object({
  _id: v.id("goals"),
  _creationTime: v.number(),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  type: goalTypeValidator,
  title: v.string(),
  description: v.optional(v.string()),
  targetValue: v.optional(v.number()),
  currentValue: v.optional(v.number()),
  unit: v.optional(v.string()),
  deadline: v.optional(v.string()),
  status: goalStatusValidator,
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
});

// ============================================================================
// listMine — list the current user's goals, optionally filtered by status
// ============================================================================

export const listMine = tenantQuery({
  args: {
    status: v.optional(goalStatusValidator),
  },
  returns: v.array(goalValidator),
  handler: async (ctx, args) => {
    if (args.status !== undefined) {
      const goals = await ctx.db
        .query("goals")
        .withIndex("by_userId_status", (q) =>
          q.eq("userId", ctx.userId).eq("status", args.status!)
        )
        .collect();

      return goals.filter((g) => g.tenantId === ctx.tenantId);
    }

    return await ctx.db
      .query("goals")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .collect();
  },
});

// ============================================================================
// getById — get a single goal by ID (owner only)
// ============================================================================

export const getById = tenantQuery({
  args: { goalId: v.id("goals") },
  returns: goalValidator,
  handler: async (ctx, args) => {
    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== ctx.userId || goal.tenantId !== ctx.tenantId) {
      throw new ConvexError("Goal not found");
    }
    return goal;
  },
});

// ============================================================================
// create — create a new goal
// ============================================================================

export const create = tenantMutation({
  args: {
    type: goalTypeValidator,
    title: v.string(),
    description: v.optional(v.string()),
    targetValue: v.optional(v.number()),
    currentValue: v.optional(v.number()),
    unit: v.optional(v.string()),
    deadline: v.optional(v.string()),
  },
  returns: v.id("goals"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("goals", {
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      ...args,
      status: "active",
      createdAt: Date.now(),
    });
  },
});

// ============================================================================
// update — update a goal (owner only)
// ============================================================================

export const update = tenantMutation({
  args: {
    goalId: v.id("goals"),
    type: v.optional(goalTypeValidator),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    targetValue: v.optional(v.number()),
    currentValue: v.optional(v.number()),
    unit: v.optional(v.string()),
    deadline: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== ctx.userId || goal.tenantId !== ctx.tenantId) {
      throw new ConvexError("Goal not found");
    }

    const { goalId: _id, ...updates } = args;
    await ctx.db.patch(args.goalId, updates);

    return null;
  },
});

// ============================================================================
// markComplete — mark a goal as completed
// ============================================================================

export const markComplete = tenantMutation({
  args: { goalId: v.id("goals") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== ctx.userId || goal.tenantId !== ctx.tenantId) {
      throw new ConvexError("Goal not found");
    }

    await ctx.db.patch(args.goalId, {
      status: "completed",
      completedAt: Date.now(),
    });

    return null;
  },
});

// ============================================================================
// abandon — mark a goal as abandoned
// ============================================================================

export const abandon = tenantMutation({
  args: { goalId: v.id("goals") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== ctx.userId || goal.tenantId !== ctx.tenantId) {
      throw new ConvexError("Goal not found");
    }

    await ctx.db.patch(args.goalId, { status: "abandoned" });

    return null;
  },
});
