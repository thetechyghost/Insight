import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// ============================================================================
// Local validators
// ============================================================================

const rewardTypeValidator = v.union(
  v.literal("credit"), v.literal("discount"),
  v.literal("free_month"), v.literal("custom"),
);

const programValidator = v.object({
  _id: v.id("referral_programs"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  rewardType: rewardTypeValidator,
  rewardValue: v.optional(v.number()),
  conditions: v.optional(v.any()),
});

// ============================================================================
// getForTenant — get the referral program for this tenant (or null)
// ============================================================================

export const getForTenant = tenantQuery({
  args: {},
  returns: v.union(programValidator, v.null()),
  handler: async (ctx) => {
    const program = await ctx.db
      .query("referral_programs")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .first();
    return program ?? null;
  },
});

// ============================================================================
// upsert — create or update the referral program (owner+)
// ============================================================================

export const upsert = tenantMutation({
  args: {
    rewardType: rewardTypeValidator,
    rewardValue: v.optional(v.number()),
    conditions: v.optional(v.any()),
  },
  returns: v.id("referral_programs"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");

    const existing = await ctx.db
      .query("referral_programs")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }

    return await ctx.db.insert("referral_programs", {
      tenantId: ctx.tenantId,
      ...args,
    });
  },
});
