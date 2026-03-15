import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";
import { checkInMethodValidator } from "./lib/validators";

// ============================================================================
// listByTenant — list check-ins for the tenant, optionally filtered by date (coach+)
// ============================================================================

export const listByTenant = tenantQuery({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("check_ins"),
      _creationTime: v.number(),
      tenantId: v.id("tenants"),
      userId: v.id("users"),
      checkedInAt: v.number(),
      method: checkInMethodValidator,
    })
  ),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    let query = ctx.db
      .query("check_ins")
      .withIndex("by_tenantId_checkedInAt", (q) => {
        let indexed = q.eq("tenantId", ctx.tenantId);
        if (args.startDate !== undefined) {
          indexed = indexed.gte("checkedInAt", args.startDate);
        }
        if (args.endDate !== undefined) {
          indexed = indexed.lte("checkedInAt", args.endDate);
        }
        return indexed;
      });

    return await query.collect();
  },
});

// ============================================================================
// listByUser — list check-ins for a user (own check-ins, or coach+ for others)
// ============================================================================

export const listByUser = tenantQuery({
  args: {
    userId: v.optional(v.id("users")),
  },
  returns: v.array(
    v.object({
      _id: v.id("check_ins"),
      _creationTime: v.number(),
      tenantId: v.id("tenants"),
      userId: v.id("users"),
      checkedInAt: v.number(),
      method: checkInMethodValidator,
    })
  ),
  handler: async (ctx, args) => {
    const targetUserId = args.userId ?? ctx.userId;

    if (args.userId && args.userId !== ctx.userId) {
      enforceRole(ctx.role, "coach");
    }

    return await ctx.db
      .query("check_ins")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", targetUserId).eq("tenantId", ctx.tenantId)
      )
      .collect();
  },
});

// ============================================================================
// checkIn — record a check-in (admin+ to check in others)
// ============================================================================

export const checkIn = tenantMutation({
  args: {
    method: checkInMethodValidator,
    userId: v.optional(v.id("users")),
  },
  returns: v.id("check_ins"),
  handler: async (ctx, args) => {
    const targetUserId = args.userId ?? ctx.userId;

    if (args.userId && args.userId !== ctx.userId) {
      enforceRole(ctx.role, "admin");
    }

    return await ctx.db.insert("check_ins", {
      tenantId: ctx.tenantId,
      userId: targetUserId,
      checkedInAt: Date.now(),
      method: args.method,
    });
  },
});
