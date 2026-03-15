import { v, ConvexError } from "convex/values";
import { tenantQuery } from "./lib/customFunctions";
import { internalMutation } from "./_generated/server";

// ============================================================================
// Return validators
// ============================================================================

const pointRecordValidator = v.object({
  _id: v.id("points"),
  _creationTime: v.number(),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  actionType: v.string(),
  pointsEarned: v.number(),
  timestamp: v.number(),
});

// ============================================================================
// getMyBalance — sum all points for the current user in this tenant
// ============================================================================

export const getMyBalance = tenantQuery({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const records = await ctx.db
      .query("points")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .collect();

    return records.reduce((sum, r) => sum + r.pointsEarned, 0);
  },
});

// ============================================================================
// award — award points to a user (internal)
// ============================================================================

export const award = internalMutation({
  args: {
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    actionType: v.string(),
    pointsEarned: v.number(),
  },
  returns: v.id("points"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("points", {
      userId: args.userId,
      tenantId: args.tenantId,
      actionType: args.actionType,
      pointsEarned: args.pointsEarned,
      timestamp: Date.now(),
    });
  },
});

// ============================================================================
// getHistory — get point history for the current user, ordered desc
// ============================================================================

export const getHistory = tenantQuery({
  args: {},
  returns: v.array(pointRecordValidator),
  handler: async (ctx) => {
    const records = await ctx.db
      .query("points")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .order("desc")
      .collect();

    return records;
  },
});
