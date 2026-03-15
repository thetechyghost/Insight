import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// ============================================================================
// Local validators
// ============================================================================

const reasonValidator = v.union(
  v.literal("sale"), v.literal("restock"),
  v.literal("adjustment"), v.literal("return"),
);

const logEntryValidator = v.object({
  _id: v.id("inventory_log"),
  _creationTime: v.number(),
  productId: v.id("products"),
  tenantId: v.id("tenants"),
  quantityChange: v.number(),
  reason: reasonValidator,
  timestamp: v.number(),
});

// ============================================================================
// getStock — get current stock for a product
// ============================================================================

export const getStock = tenantQuery({
  args: { productId: v.id("products") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product || product.tenantId !== ctx.tenantId) {
      throw new ConvexError("Product not found");
    }
    return product.stockQuantity ?? 0;
  },
});

// ============================================================================
// adjust — adjust stock and create log entry (admin+)
// ============================================================================

export const adjust = tenantMutation({
  args: {
    productId: v.id("products"),
    quantityChange: v.number(),
    reason: reasonValidator,
  },
  returns: v.id("inventory_log"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    const product = await ctx.db.get(args.productId);
    if (!product || product.tenantId !== ctx.tenantId) {
      throw new ConvexError("Product not found");
    }

    const currentStock = product.stockQuantity ?? 0;
    const newStock = currentStock + args.quantityChange;

    await ctx.db.patch(args.productId, { stockQuantity: newStock });

    return await ctx.db.insert("inventory_log", {
      productId: args.productId,
      tenantId: ctx.tenantId,
      quantityChange: args.quantityChange,
      reason: args.reason,
      timestamp: Date.now(),
    });
  },
});

// ============================================================================
// getLog — get inventory log for a product (admin+)
// ============================================================================

export const getLog = tenantQuery({
  args: { productId: v.id("products") },
  returns: v.array(logEntryValidator),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    return await ctx.db
      .query("inventory_log")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .filter((q) => q.eq(q.field("tenantId"), ctx.tenantId))
      .collect();
  },
});
