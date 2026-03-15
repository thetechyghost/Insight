import { v } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// --- Return validator ---

const bookingPolicyValidator = v.object({
  _id: v.id("booking_policies"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  cancellationWindowHours: v.number(),
  lateCancelPenalty: v.optional(v.number()),
  maxBookingsPerWeek: v.optional(v.number()),
  waitlistEnabled: v.boolean(),
  autoPromoteFromWaitlist: v.boolean(),
});

// ============================================================================
// getForTenant — get the booking policy for the tenant (or null)
// ============================================================================

export const getForTenant = tenantQuery({
  args: {},
  returns: v.union(bookingPolicyValidator, v.null()),
  handler: async (ctx) => {
    return await ctx.db
      .query("booking_policies")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .first();
  },
});

// ============================================================================
// upsert — create or update the booking policy (owner+)
// ============================================================================

export const upsert = tenantMutation({
  args: {
    cancellationWindowHours: v.number(),
    lateCancelPenalty: v.optional(v.number()),
    maxBookingsPerWeek: v.optional(v.number()),
    waitlistEnabled: v.boolean(),
    autoPromoteFromWaitlist: v.boolean(),
  },
  returns: v.id("booking_policies"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");

    const existing = await ctx.db
      .query("booking_policies")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }

    return await ctx.db.insert("booking_policies", {
      tenantId: ctx.tenantId,
      ...args,
    });
  },
});
