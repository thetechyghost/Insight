import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation } from "./lib/customFunctions";

// ============================================================================
// Local validators
// ============================================================================

const foodItemValidator = v.object({
  _id: v.id("food_database"),
  _creationTime: v.number(),
  name: v.string(),
  servingSize: v.optional(v.string()),
  calories: v.optional(v.number()),
  protein: v.optional(v.number()),
  carbs: v.optional(v.number()),
  fat: v.optional(v.number()),
  fiber: v.optional(v.number()),
  source: v.union(v.literal("platform"), v.literal("user_created")),
  tenantId: v.optional(v.id("tenants")),
});

// ============================================================================
// search — search food database (platform + tenant items), max 20
// ============================================================================

export const search = tenantQuery({
  args: { query: v.string() },
  returns: v.array(foodItemValidator),
  handler: async (ctx, args) => {
    const queryLower = args.query.toLowerCase();

    // Get platform items (tenantId is undefined)
    const platformItems = await ctx.db
      .query("food_database")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", undefined))
      .collect();

    // Get tenant-specific items
    const tenantItems = await ctx.db
      .query("food_database")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();

    const all = [...platformItems, ...tenantItems];
    const filtered = all.filter((item) =>
      item.name.toLowerCase().includes(queryLower)
    );

    return filtered.slice(0, 20);
  },
});

// ============================================================================
// create — add a custom food item to the database
// ============================================================================

export const create = tenantMutation({
  args: {
    name: v.string(),
    servingSize: v.optional(v.string()),
    calories: v.optional(v.number()),
    protein: v.optional(v.number()),
    carbs: v.optional(v.number()),
    fat: v.optional(v.number()),
    fiber: v.optional(v.number()),
  },
  returns: v.id("food_database"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("food_database", {
      ...args,
      source: "user_created",
      tenantId: ctx.tenantId,
    });
  },
});

// ============================================================================
// getById — get a single food database entry
// ============================================================================

export const getById = tenantQuery({
  args: { foodId: v.id("food_database") },
  returns: foodItemValidator,
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.foodId);
    if (!item) {
      throw new ConvexError("Food item not found");
    }
    // Allow access to platform items or own tenant items
    if (item.tenantId && item.tenantId !== ctx.tenantId) {
      throw new ConvexError("Food item not found");
    }
    return item;
  },
});
