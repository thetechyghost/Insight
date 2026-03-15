import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";
import { internalMutation } from "./_generated/server";

// --- Return validator ---

const subscriptionValidator = v.object({
  _id: v.id("subscriptions"),
  _creationTime: v.number(),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  planId: v.id("membership_plans"),
  stripeSubscriptionId: v.optional(v.string()),
  status: v.union(
    v.literal("active"), v.literal("past_due"), v.literal("frozen"),
    v.literal("cancelled"), v.literal("trialing"), v.literal("paused"),
  ),
  startDate: v.string(),
  currentPeriodStart: v.optional(v.string()),
  currentPeriodEnd: v.optional(v.string()),
  cancelAtPeriodEnd: v.optional(v.boolean()),
  frozenAt: v.optional(v.number()),
  frozenUntil: v.optional(v.string()),
});

// ============================================================================
// getMySubscription — get the current user's active subscription
// ============================================================================

export const getMySubscription = tenantQuery({
  args: {},
  returns: v.union(subscriptionValidator, v.null()),
  handler: async (ctx) => {
    const subs = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .collect();

    return subs.find((s) => s.status === "active" || s.status === "trialing") ?? null;
  },
});

// ============================================================================
// listByTenant — list all subscriptions for the tenant (admin+)
// ============================================================================

export const listByTenant = tenantQuery({
  args: {},
  returns: v.array(subscriptionValidator),
  handler: async (ctx) => {
    enforceRole(ctx.role, "admin");

    return await ctx.db
      .query("subscriptions")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
  },
});

// ============================================================================
// changePlan — change to a different membership plan
// ============================================================================

export const changePlan = tenantMutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    newPlanId: v.id("membership_plans"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.subscriptionId);
    if (!sub || sub.tenantId !== ctx.tenantId || sub.userId !== ctx.userId) {
      throw new ConvexError("Subscription not found");
    }

    const newPlan = await ctx.db.get(args.newPlanId);
    if (!newPlan || newPlan.tenantId !== ctx.tenantId) {
      throw new ConvexError("Plan not found");
    }

    await ctx.db.patch(args.subscriptionId, { planId: args.newPlanId });
    return null;
  },
});

// ============================================================================
// freeze — pause a subscription
// ============================================================================

export const freeze = tenantMutation({
  args: { subscriptionId: v.id("subscriptions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.subscriptionId);
    if (!sub || sub.tenantId !== ctx.tenantId || sub.userId !== ctx.userId) {
      throw new ConvexError("Subscription not found");
    }

    if (sub.status !== "active") {
      throw new ConvexError("Only active subscriptions can be frozen");
    }

    await ctx.db.patch(args.subscriptionId, {
      status: "paused",
      frozenAt: Date.now(),
    });
    return null;
  },
});

// ============================================================================
// cancel — mark subscription to cancel at period end
// ============================================================================

export const cancel = tenantMutation({
  args: { subscriptionId: v.id("subscriptions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.subscriptionId);
    if (!sub || sub.tenantId !== ctx.tenantId || sub.userId !== ctx.userId) {
      throw new ConvexError("Subscription not found");
    }

    await ctx.db.patch(args.subscriptionId, { cancelAtPeriodEnd: true });
    return null;
  },
});

// ============================================================================
// syncFromStripe — internal: sync subscription state from Stripe webhook
// ============================================================================

export const syncFromStripe = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    status: v.union(
      v.literal("active"), v.literal("past_due"), v.literal("frozen"),
      v.literal("cancelled"), v.literal("trialing"), v.literal("paused"),
    ),
    currentPeriodStart: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripeSubscriptionId", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();

    if (!sub) {
      throw new ConvexError("Subscription not found for Stripe ID");
    }

    const updates: Record<string, unknown> = { status: args.status };
    if (args.currentPeriodStart !== undefined) updates.currentPeriodStart = args.currentPeriodStart;
    if (args.currentPeriodEnd !== undefined) updates.currentPeriodEnd = args.currentPeriodEnd;

    await ctx.db.patch(sub._id, updates);
    return null;
  },
});
