import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// ============================================================================
// Local validators
// ============================================================================

const variantValidator = v.object({
  name: v.string(),
  value: v.string(),
  priceAdjustment: v.optional(v.number()),
  sku: v.optional(v.string()),
});

const productValidator = v.object({
  _id: v.id("products"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  name: v.string(),
  description: v.optional(v.string()),
  sku: v.optional(v.string()),
  categoryId: v.optional(v.id("product_categories")),
  price: v.number(),
  variants: v.optional(v.array(variantValidator)),
  stockQuantity: v.optional(v.number()),
  imageStorageIds: v.optional(v.array(v.id("_storage"))),
  isActive: v.boolean(),
});

// ============================================================================
// list — list active products for this tenant
// ============================================================================

export const list = tenantQuery({
  args: {},
  returns: v.array(productValidator),
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
    return products.filter((p) => p.isActive);
  },
});

// ============================================================================
// getById — get a single product
// ============================================================================

export const getById = tenantQuery({
  args: { productId: v.id("products") },
  returns: productValidator,
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product || product.tenantId !== ctx.tenantId) {
      throw new ConvexError("Product not found");
    }
    return product;
  },
});

// ============================================================================
// create — create a new product (admin+)
// ============================================================================

export const create = tenantMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    sku: v.optional(v.string()),
    categoryId: v.optional(v.id("product_categories")),
    price: v.number(),
    variants: v.optional(v.array(variantValidator)),
    stockQuantity: v.optional(v.number()),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
  },
  returns: v.id("products"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    return await ctx.db.insert("products", {
      tenantId: ctx.tenantId,
      ...args,
      isActive: true,
    });
  },
});

// ============================================================================
// update — update a product (admin+)
// ============================================================================

export const update = tenantMutation({
  args: {
    productId: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    sku: v.optional(v.string()),
    categoryId: v.optional(v.id("product_categories")),
    price: v.optional(v.number()),
    variants: v.optional(v.array(variantValidator)),
    stockQuantity: v.optional(v.number()),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    const product = await ctx.db.get(args.productId);
    if (!product || product.tenantId !== ctx.tenantId) {
      throw new ConvexError("Product not found");
    }
    const { productId: _, ...updates } = args;
    await ctx.db.patch(args.productId, updates);
    return null;
  },
});

// ============================================================================
// deactivate — soft-delete a product (admin+)
// ============================================================================

export const deactivate = tenantMutation({
  args: { productId: v.id("products") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    const product = await ctx.db.get(args.productId);
    if (!product || product.tenantId !== ctx.tenantId) {
      throw new ConvexError("Product not found");
    }
    await ctx.db.patch(args.productId, { isActive: false });
    return null;
  },
});
