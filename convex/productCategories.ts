import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// ============================================================================
// Local validators
// ============================================================================

const categoryValidator = v.object({
  _id: v.id("product_categories"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  name: v.string(),
  parentCategoryId: v.optional(v.id("product_categories")),
});

// ============================================================================
// list — list product categories for this tenant
// ============================================================================

export const list = tenantQuery({
  args: {},
  returns: v.array(categoryValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("product_categories")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
  },
});

// ============================================================================
// create — create a new category (admin+)
// ============================================================================

export const create = tenantMutation({
  args: {
    name: v.string(),
    parentCategoryId: v.optional(v.id("product_categories")),
  },
  returns: v.id("product_categories"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    return await ctx.db.insert("product_categories", {
      tenantId: ctx.tenantId,
      ...args,
    });
  },
});

// ============================================================================
// update — update a category (admin+)
// ============================================================================

export const update = tenantMutation({
  args: {
    categoryId: v.id("product_categories"),
    name: v.optional(v.string()),
    parentCategoryId: v.optional(v.id("product_categories")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    const cat = await ctx.db.get(args.categoryId);
    if (!cat || cat.tenantId !== ctx.tenantId) {
      throw new ConvexError("Category not found");
    }
    const { categoryId: _, ...updates } = args;
    await ctx.db.patch(args.categoryId, updates);
    return null;
  },
});

// ============================================================================
// remove — delete a category (admin+)
// ============================================================================

export const remove = tenantMutation({
  args: { categoryId: v.id("product_categories") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    const cat = await ctx.db.get(args.categoryId);
    if (!cat || cat.tenantId !== ctx.tenantId) {
      throw new ConvexError("Category not found");
    }
    await ctx.db.delete(args.categoryId);
    return null;
  },
});
