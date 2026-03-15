import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation } from "./lib/customFunctions";

// --- Return validator ---

const paymentMethodValidator = v.object({
  _id: v.id("payment_methods"),
  _creationTime: v.number(),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  stripePaymentMethodId: v.optional(v.string()),
  type: v.union(
    v.literal("card"), v.literal("bank"), v.literal("apple_pay"), v.literal("google_pay"),
  ),
  last4: v.optional(v.string()),
  brand: v.optional(v.string()),
  expiryMonth: v.optional(v.number()),
  expiryYear: v.optional(v.number()),
  isDefault: v.boolean(),
});

// ============================================================================
// listMine — list all payment methods for the current user
// ============================================================================

export const listMine = tenantQuery({
  args: {},
  returns: v.array(paymentMethodValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("payment_methods")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .collect();
  },
});

// ============================================================================
// remove — remove a payment method (cannot delete default if others exist)
// ============================================================================

export const remove = tenantMutation({
  args: { paymentMethodId: v.id("payment_methods") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const pm = await ctx.db.get(args.paymentMethodId);
    if (!pm || pm.userId !== ctx.userId || pm.tenantId !== ctx.tenantId) {
      throw new ConvexError("Payment method not found");
    }

    if (pm.isDefault) {
      const others = await ctx.db
        .query("payment_methods")
        .withIndex("by_userId_tenantId", (q) =>
          q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
        )
        .collect();

      if (others.filter((o) => o._id !== args.paymentMethodId).length > 0) {
        throw new ConvexError("Cannot delete default payment method while others exist. Set another as default first.");
      }
    }

    await ctx.db.delete(args.paymentMethodId);
    return null;
  },
});

// ============================================================================
// setDefault — set a payment method as default (unsets all others)
// ============================================================================

export const setDefault = tenantMutation({
  args: { paymentMethodId: v.id("payment_methods") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const pm = await ctx.db.get(args.paymentMethodId);
    if (!pm || pm.userId !== ctx.userId || pm.tenantId !== ctx.tenantId) {
      throw new ConvexError("Payment method not found");
    }

    const allMethods = await ctx.db
      .query("payment_methods")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .collect();

    for (const method of allMethods) {
      if (method._id === args.paymentMethodId) {
        await ctx.db.patch(method._id, { isDefault: true });
      } else if (method.isDefault) {
        await ctx.db.patch(method._id, { isDefault: false });
      }
    }

    return null;
  },
});
