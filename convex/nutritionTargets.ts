import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// ============================================================================
// Local validators
// ============================================================================

const targetValidator = v.object({
  _id: v.id("nutrition_targets"),
  _creationTime: v.number(),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  calories: v.optional(v.number()),
  protein: v.optional(v.number()),
  carbs: v.optional(v.number()),
  fat: v.optional(v.number()),
  setBy: v.optional(v.union(v.literal("user"), v.literal("coach"))),
});

// ============================================================================
// getMine — get current user's nutrition targets (or null)
// ============================================================================

export const getMine = tenantQuery({
  args: {},
  returns: v.union(targetValidator, v.null()),
  handler: async (ctx) => {
    const target = await ctx.db
      .query("nutrition_targets")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .first();
    return target ?? null;
  },
});

// ============================================================================
// set — upsert own nutrition targets
// ============================================================================

export const set = tenantMutation({
  args: {
    calories: v.optional(v.number()),
    protein: v.optional(v.number()),
    carbs: v.optional(v.number()),
    fat: v.optional(v.number()),
  },
  returns: v.id("nutrition_targets"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("nutrition_targets")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, setBy: "user" });
      return existing._id;
    }

    return await ctx.db.insert("nutrition_targets", {
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      ...args,
      setBy: "user",
    });
  },
});

// ============================================================================
// setForAthlete — set nutrition targets for an athlete (coach+)
// ============================================================================

export const setForAthlete = tenantMutation({
  args: {
    userId: v.id("users"),
    calories: v.optional(v.number()),
    protein: v.optional(v.number()),
    carbs: v.optional(v.number()),
    fat: v.optional(v.number()),
  },
  returns: v.id("nutrition_targets"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const { userId, ...targets } = args;

    const existing = await ctx.db
      .query("nutrition_targets")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", userId).eq("tenantId", ctx.tenantId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { ...targets, setBy: "coach" });
      return existing._id;
    }

    return await ctx.db.insert("nutrition_targets", {
      userId,
      tenantId: ctx.tenantId,
      ...targets,
      setBy: "coach",
    });
  },
});
