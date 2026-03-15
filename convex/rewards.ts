import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// ============================================================================
// Return validators
// ============================================================================

const rewardValidator = v.object({
  _id: v.id("rewards"),
  _creationTime: v.number(),
  name: v.string(),
  description: v.optional(v.string()),
  pointCost: v.number(),
  quantityAvailable: v.optional(v.number()),
  tenantId: v.id("tenants"),
});

const redemptionValidator = v.object({
  _id: v.id("reward_redemptions"),
  _creationTime: v.number(),
  rewardId: v.id("rewards"),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  redeemedAt: v.number(),
});

// ============================================================================
// list — list active rewards for this tenant
// ============================================================================

export const list = tenantQuery({
  args: {},
  returns: v.array(rewardValidator),
  handler: async (ctx) => {
    const rewards = await ctx.db
      .query("rewards")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();

    // Filter out rewards with no quantity remaining
    return rewards.filter(
      (r) => r.quantityAvailable === undefined || r.quantityAvailable > 0
    );
  },
});

// ============================================================================
// create — create a new reward (owner+)
// ============================================================================

export const create = tenantMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    pointCost: v.number(),
    quantityAvailable: v.optional(v.number()),
  },
  returns: v.id("rewards"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");

    return await ctx.db.insert("rewards", {
      name: args.name,
      description: args.description,
      pointCost: args.pointCost,
      quantityAvailable: args.quantityAvailable,
      tenantId: ctx.tenantId,
    });
  },
});

// ============================================================================
// update — update a reward (owner+)
// ============================================================================

export const update = tenantMutation({
  args: {
    rewardId: v.id("rewards"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    pointCost: v.optional(v.number()),
    quantityAvailable: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");

    const reward = await ctx.db.get(args.rewardId);
    if (!reward || reward.tenantId !== ctx.tenantId) {
      throw new ConvexError("Reward not found");
    }

    const { rewardId: _id, ...updates } = args;
    await ctx.db.patch(args.rewardId, updates);
    return null;
  },
});

// ============================================================================
// remove — soft-delete a reward by setting quantity to 0 (owner+)
// ============================================================================

export const remove = tenantMutation({
  args: { rewardId: v.id("rewards") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");

    const reward = await ctx.db.get(args.rewardId);
    if (!reward || reward.tenantId !== ctx.tenantId) {
      throw new ConvexError("Reward not found");
    }

    await ctx.db.patch(args.rewardId, { quantityAvailable: 0 });
    return null;
  },
});

// ============================================================================
// redeem — redeem a reward using points
// ============================================================================

export const redeem = tenantMutation({
  args: { rewardId: v.id("rewards") },
  returns: v.id("reward_redemptions"),
  handler: async (ctx, args) => {
    const reward = await ctx.db.get(args.rewardId);
    if (!reward || reward.tenantId !== ctx.tenantId) {
      throw new ConvexError("Reward not found");
    }

    if (reward.quantityAvailable !== undefined && reward.quantityAvailable <= 0) {
      throw new ConvexError("Reward is no longer available");
    }

    // Calculate user's point balance
    const pointRecords = await ctx.db
      .query("points")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .collect();

    const balance = pointRecords.reduce((sum, r) => sum + r.pointsEarned, 0);

    if (balance < reward.pointCost) {
      throw new ConvexError("Insufficient points");
    }

    // Deduct points (insert negative record)
    await ctx.db.insert("points", {
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      actionType: `reward_redemption:${reward.name}`,
      pointsEarned: -reward.pointCost,
      timestamp: Date.now(),
    });

    // Decrement quantity if tracked
    if (reward.quantityAvailable !== undefined) {
      await ctx.db.patch(args.rewardId, {
        quantityAvailable: reward.quantityAvailable - 1,
      });
    }

    // Record redemption
    return await ctx.db.insert("reward_redemptions", {
      rewardId: args.rewardId,
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      redeemedAt: Date.now(),
    });
  },
});
