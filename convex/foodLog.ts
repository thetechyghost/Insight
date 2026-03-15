import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation } from "./lib/customFunctions";

// ============================================================================
// Local validators
// ============================================================================

const mealValidator = v.union(
  v.literal("breakfast"), v.literal("lunch"),
  v.literal("dinner"), v.literal("snack"),
);

const foodLogValidator = v.object({
  _id: v.id("food_log"),
  _creationTime: v.number(),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  date: v.string(),
  meal: mealValidator,
  foodItem: v.string(),
  calories: v.optional(v.number()),
  protein: v.optional(v.number()),
  carbs: v.optional(v.number()),
  fat: v.optional(v.number()),
  fiber: v.optional(v.number()),
});

// ============================================================================
// listByDate — list food log entries for a specific date
// ============================================================================

export const listByDate = tenantQuery({
  args: { date: v.string() },
  returns: v.array(foodLogValidator),
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("food_log")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", ctx.userId).eq("date", args.date)
      )
      .collect();
    return entries.filter((e) => e.tenantId === ctx.tenantId);
  },
});

// ============================================================================
// create — log a food entry
// ============================================================================

export const create = tenantMutation({
  args: {
    date: v.string(),
    meal: mealValidator,
    foodItem: v.string(),
    calories: v.optional(v.number()),
    protein: v.optional(v.number()),
    carbs: v.optional(v.number()),
    fat: v.optional(v.number()),
    fiber: v.optional(v.number()),
  },
  returns: v.id("food_log"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("food_log", {
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      ...args,
    });
  },
});

// ============================================================================
// update — update own food log entry
// ============================================================================

export const update = tenantMutation({
  args: {
    entryId: v.id("food_log"),
    meal: v.optional(mealValidator),
    foodItem: v.optional(v.string()),
    calories: v.optional(v.number()),
    protein: v.optional(v.number()),
    carbs: v.optional(v.number()),
    fat: v.optional(v.number()),
    fiber: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== ctx.userId || entry.tenantId !== ctx.tenantId) {
      throw new ConvexError("Food log entry not found");
    }
    const { entryId: _, ...updates } = args;
    await ctx.db.patch(args.entryId, updates);
    return null;
  },
});

// ============================================================================
// remove — delete own food log entry
// ============================================================================

export const remove = tenantMutation({
  args: { entryId: v.id("food_log") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== ctx.userId || entry.tenantId !== ctx.tenantId) {
      throw new ConvexError("Food log entry not found");
    }
    await ctx.db.delete(args.entryId);
    return null;
  },
});
