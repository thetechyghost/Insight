import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";
import { internalMutation } from "./_generated/server";

// ============================================================================
// Return validators
// ============================================================================

const streakValidator = v.object({
  _id: v.id("concept2_streaks"),
  _creationTime: v.number(),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  currentStreak: v.number(),
  longestStreak: v.number(),
  lastActivityDate: v.optional(v.string()),
});

const streakResponseValidator = v.object({
  currentStreak: v.number(),
  longestStreak: v.number(),
  lastActivityDate: v.optional(v.string()),
});

// ============================================================================
// getMine — get the current user's Concept2 streak
// ============================================================================

export const getMine = tenantQuery({
  args: {},
  returns: streakResponseValidator,
  handler: async (ctx) => {
    const record = await ctx.db
      .query("concept2_streaks")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .first();

    if (!record) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: undefined,
      };
    }

    return {
      currentStreak: record.currentStreak,
      longestStreak: record.longestStreak,
      lastActivityDate: record.lastActivityDate,
    };
  },
});

// ============================================================================
// updateStreak — update a user's streak based on activity date (internal)
// ============================================================================

export const updateStreak = internalMutation({
  args: {
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    activityDate: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("concept2_streaks")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", args.userId).eq("tenantId", args.tenantId)
      )
      .first();

    if (!existing) {
      await ctx.db.insert("concept2_streaks", {
        userId: args.userId,
        tenantId: args.tenantId,
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: args.activityDate,
      });
      return null;
    }

    // Calculate day difference
    const lastDate = existing.lastActivityDate
      ? new Date(existing.lastActivityDate)
      : null;
    const activityDateObj = new Date(args.activityDate);

    let newStreak = existing.currentStreak;

    if (!lastDate) {
      newStreak = 1;
    } else {
      const diffMs = activityDateObj.getTime() - lastDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day — increment streak
        newStreak = existing.currentStreak + 1;
      } else if (diffDays === 0) {
        // Same day — no change
        return null;
      } else {
        // Streak broken — reset
        newStreak = 1;
      }
    }

    const newLongest = Math.max(existing.longestStreak, newStreak);

    await ctx.db.patch(existing._id, {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActivityDate: args.activityDate,
    });

    return null;
  },
});
