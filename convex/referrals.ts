import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation } from "./lib/customFunctions";
import { internalMutation } from "./_generated/server";

// ============================================================================
// Local validators
// ============================================================================

const referralStatusValidator = v.union(
  v.literal("pending"), v.literal("converted"),
);

const rewardStatusValidator = v.optional(
  v.union(v.literal("pending"), v.literal("paid")),
);

const referralValidator = v.object({
  _id: v.id("referrals"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  referrerUserId: v.id("users"),
  referredLeadId: v.optional(v.id("leads")),
  referredUserId: v.optional(v.id("users")),
  status: referralStatusValidator,
  rewardStatus: rewardStatusValidator,
  rewardType: v.optional(v.string()),
});

// ============================================================================
// listMine — list current user's referrals
// ============================================================================

export const listMine = tenantQuery({
  args: {},
  returns: v.array(referralValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("referrals")
      .withIndex("by_referrerUserId", (q) =>
        q.eq("referrerUserId", ctx.userId)
      )
      .filter((q) => q.eq(q.field("tenantId"), ctx.tenantId))
      .collect();
  },
});

// ============================================================================
// create — create a new referral
// ============================================================================

export const create = tenantMutation({
  args: {
    referredLeadId: v.optional(v.id("leads")),
    rewardType: v.optional(v.string()),
  },
  returns: v.id("referrals"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("referrals", {
      tenantId: ctx.tenantId,
      referrerUserId: ctx.userId,
      referredLeadId: args.referredLeadId,
      status: "pending",
      rewardType: args.rewardType,
    });
  },
});

// ============================================================================
// track — link a referred user to a referral (internal)
// ============================================================================

export const track = internalMutation({
  args: {
    referralId: v.id("referrals"),
    referredUserId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const referral = await ctx.db.get(args.referralId);
    if (!referral) {
      throw new ConvexError("Referral not found");
    }
    await ctx.db.patch(args.referralId, {
      referredUserId: args.referredUserId,
      status: "converted",
    });
    return null;
  },
});

// ============================================================================
// fulfillReward — mark reward as paid (internal)
// ============================================================================

export const fulfillReward = internalMutation({
  args: { referralId: v.id("referrals") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const referral = await ctx.db.get(args.referralId);
    if (!referral) {
      throw new ConvexError("Referral not found");
    }
    await ctx.db.patch(args.referralId, { rewardStatus: "paid" });
    return null;
  },
});
