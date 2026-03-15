import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// ============================================================================
// Local validators
// ============================================================================

const orderStatusValidator = v.union(
  v.literal("pending"), v.literal("paid"),
  v.literal("fulfilled"), v.literal("refunded"),
);

const lineItemValidator = v.object({
  productId: v.id("products"),
  productName: v.string(),
  quantity: v.number(),
  unitPrice: v.number(),
  variantInfo: v.optional(v.string()),
});

const orderValidator = v.object({
  _id: v.id("orders"),
  _creationTime: v.number(),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  lineItems: v.array(lineItemValidator),
  subtotal: v.number(),
  tax: v.number(),
  total: v.number(),
  paymentRef: v.optional(v.string()),
  status: orderStatusValidator,
  fulfillmentMethod: v.optional(
    v.union(v.literal("in_person"), v.literal("shipped"))
  ),
});

// ============================================================================
// listMine — list current user's orders
// ============================================================================

export const listMine = tenantQuery({
  args: {},
  returns: v.array(orderValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .collect();
  },
});

// ============================================================================
// listByTenant — list all orders for tenant (admin+)
// ============================================================================

export const listByTenant = tenantQuery({
  args: {},
  returns: v.array(orderValidator),
  handler: async (ctx) => {
    enforceRole(ctx.role, "admin");
    return await ctx.db
      .query("orders")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
  },
});

// ============================================================================
// create — create a new order
// ============================================================================

export const create = tenantMutation({
  args: {
    lineItems: v.array(lineItemValidator),
    subtotal: v.number(),
    tax: v.number(),
    total: v.number(),
    paymentRef: v.optional(v.string()),
    fulfillmentMethod: v.optional(
      v.union(v.literal("in_person"), v.literal("shipped"))
    ),
  },
  returns: v.id("orders"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("orders", {
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      ...args,
      status: "pending",
    });
  },
});

// ============================================================================
// updateStatus — update an order's status (admin+)
// ============================================================================

export const updateStatus = tenantMutation({
  args: {
    orderId: v.id("orders"),
    status: orderStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    const order = await ctx.db.get(args.orderId);
    if (!order || order.tenantId !== ctx.tenantId) {
      throw new ConvexError("Order not found");
    }
    await ctx.db.patch(args.orderId, { status: args.status });
    return null;
  },
});

// ============================================================================
// refund — mark an order as refunded (admin+)
// ============================================================================

export const refund = tenantMutation({
  args: { orderId: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    const order = await ctx.db.get(args.orderId);
    if (!order || order.tenantId !== ctx.tenantId) {
      throw new ConvexError("Order not found");
    }
    await ctx.db.patch(args.orderId, { status: "refunded" });
    return null;
  },
});
