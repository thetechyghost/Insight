import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// --- Return validators ---

const paymentHistoryValidator = v.object({
  _id: v.id("payment_history"),
  _creationTime: v.number(),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  amount: v.number(),
  currency: v.string(),
  type: v.union(
    v.literal("charge"), v.literal("refund"), v.literal("credit"),
    v.literal("subscription"), v.literal("one_time"),
  ),
  description: v.optional(v.string()),
  stripePaymentIntentId: v.optional(v.string()),
  createdAt: v.number(),
  timestamp: v.optional(v.number()),
  status: v.optional(v.union(
    v.literal("succeeded"), v.literal("pending"), v.literal("failed"), v.literal("refunded"),
  )),
});

const creditValidator = v.object({
  _id: v.id("credits"),
  _creationTime: v.number(),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  amount: v.number(),
  reason: v.string(),
  grantedBy: v.optional(v.id("users")),
  createdAt: v.number(),
  expiresAt: v.optional(v.number()),
  expiryDate: v.optional(v.string()),
});

const failedPaymentValidator = v.object({
  _id: v.id("failed_payments"),
  _creationTime: v.number(),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  amount: v.number(),
  currency: v.string(),
  reason: v.string(),
  stripePaymentIntentId: v.optional(v.string()),
  retryCount: v.number(),
  nextRetryAt: v.optional(v.number()),
  createdAt: v.number(),
  subscriptionId: v.optional(v.id("subscriptions")),
  attemptCount: v.optional(v.number()),
  lastAttemptDate: v.optional(v.string()),
  nextRetryDate: v.optional(v.string()),
  status: v.optional(v.union(
    v.literal("retrying"), v.literal("action_required"), v.literal("written_off"),
  )),
});

// ============================================================================
// getHistory — get payment history for the current user
// ============================================================================

export const getHistory = tenantQuery({
  args: {},
  returns: v.array(paymentHistoryValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("payment_history")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .order("desc")
      .collect();
  },
});

// ============================================================================
// getCredits — get non-expired credits for the current user
// ============================================================================

export const getCredits = tenantQuery({
  args: {},
  returns: v.array(creditValidator),
  handler: async (ctx) => {
    const credits = await ctx.db
      .query("credits")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .collect();

    const now = Date.now();
    return credits.filter((c) => !c.expiresAt || c.expiresAt > now);
  },
});

// ============================================================================
// addCredit — grant credit to a user (admin+)
// ============================================================================

export const addCredit = tenantMutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    reason: v.string(),
    expiresAt: v.optional(v.number()),
  },
  returns: v.id("credits"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    return await ctx.db.insert("credits", {
      tenantId: ctx.tenantId,
      userId: args.userId,
      amount: args.amount,
      reason: args.reason,
      grantedBy: ctx.userId,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
    });
  },
});

// ============================================================================
// getFailedPayments — list failed payments for the tenant (admin+)
// ============================================================================

export const getFailedPayments = tenantQuery({
  args: {},
  returns: v.array(failedPaymentValidator),
  handler: async (ctx) => {
    enforceRole(ctx.role, "admin");

    return await ctx.db
      .query("failed_payments")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .order("desc")
      .collect();
  },
});
