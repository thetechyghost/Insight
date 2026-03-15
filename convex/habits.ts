import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// ============================================================================
// Local validators
// ============================================================================

const frequencyValidator = v.union(v.literal("daily"), v.literal("weekly"));

// ============================================================================
// Return validators
// ============================================================================

const habitValidator = v.object({
  _id: v.id("habits"),
  _creationTime: v.number(),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  name: v.string(),
  frequency: frequencyValidator,
  trackingRecords: v.optional(v.array(v.string())),
});

// ============================================================================
// listMine — list the current user's habits
// ============================================================================

export const listMine = tenantQuery({
  args: {},
  returns: v.array(habitValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("habits")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .collect();
  },
});

// ============================================================================
// create — create a new habit
// ============================================================================

export const create = tenantMutation({
  args: {
    name: v.string(),
    frequency: frequencyValidator,
  },
  returns: v.id("habits"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("habits", {
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      name: args.name,
      frequency: args.frequency,
      trackingRecords: [],
    });
  },
});

// ============================================================================
// logCompletion — log a habit completion for a given date
// ============================================================================

export const logCompletion = tenantMutation({
  args: {
    habitId: v.id("habits"),
    date: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const habit = await ctx.db.get(args.habitId);
    if (!habit || habit.userId !== ctx.userId || habit.tenantId !== ctx.tenantId) {
      throw new ConvexError("Habit not found");
    }

    const records = habit.trackingRecords ?? [];
    if (!records.includes(args.date)) {
      await ctx.db.patch(args.habitId, {
        trackingRecords: [...records, args.date],
      });
    }

    return null;
  },
});

// ============================================================================
// remove — delete a habit (owner only)
// ============================================================================

export const remove = tenantMutation({
  args: { habitId: v.id("habits") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const habit = await ctx.db.get(args.habitId);
    if (!habit || habit.userId !== ctx.userId || habit.tenantId !== ctx.tenantId) {
      throw new ConvexError("Habit not found");
    }

    await ctx.db.delete(args.habitId);
    return null;
  },
});
