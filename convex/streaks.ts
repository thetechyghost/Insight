import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation } from "./lib/customFunctions";
import { internalMutation } from "./_generated/server";

// ============================================================================
// Local validators
// ============================================================================

const streakTypeValidator = v.union(
  v.literal("workout"),
  v.literal("class_attendance"),
  v.literal("logging"),
  v.literal("concept2")
);

// ============================================================================
// Return validators
// ============================================================================

const streakValidator = v.object({
  _id: v.id("streaks"),
  _creationTime: v.number(),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  type: streakTypeValidator,
  currentCount: v.number(),
  longestCount: v.number(),
  lastActivityDate: v.optional(v.string()),
  freezeCreditsRemaining: v.optional(v.number()),
});

// ============================================================================
// getMine — get the current user's streaks for this tenant
// ============================================================================

export const getMine = tenantQuery({
  args: {},
  returns: v.array(streakValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("streaks")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .collect();
  },
});

// ============================================================================
// updateStreak — update a user's streak based on activity date (internal)
// ============================================================================

export const updateStreak = internalMutation({
  args: {
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    type: streakTypeValidator,
    activityDate: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("streaks")
      .withIndex("by_userId_type", (q) =>
        q.eq("userId", args.userId).eq("type", args.type)
      )
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .first();

    if (!existing) {
      await ctx.db.insert("streaks", {
        userId: args.userId,
        tenantId: args.tenantId,
        type: args.type,
        currentCount: 1,
        longestCount: 1,
        lastActivityDate: args.activityDate,
      });
      return null;
    }

    // Calculate day difference
    const lastDate = existing.lastActivityDate
      ? new Date(existing.lastActivityDate)
      : null;
    const activityDateObj = new Date(args.activityDate);

    let newStreak = existing.currentCount;

    if (!lastDate) {
      newStreak = 1;
    } else {
      const diffMs = activityDateObj.getTime() - lastDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        newStreak = existing.currentCount + 1;
      } else if (diffDays === 0) {
        // Same day — no change
        return null;
      } else {
        // Streak broken — reset
        newStreak = 1;
      }
    }

    const newLongest = Math.max(existing.longestCount, newStreak);

    await ctx.db.patch(existing._id, {
      currentCount: newStreak,
      longestCount: newLongest,
      lastActivityDate: args.activityDate,
    });

    return null;
  },
});

// ============================================================================
// useFreeze — use a freeze credit to preserve a streak
// ============================================================================

export const useFreeze = tenantMutation({
  args: { streakId: v.id("streaks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const streak = await ctx.db.get(args.streakId);
    if (!streak || streak.userId !== ctx.userId || streak.tenantId !== ctx.tenantId) {
      throw new ConvexError("Streak not found");
    }

    const credits = streak.freezeCreditsRemaining ?? 0;
    if (credits <= 0) {
      throw new ConvexError("No freeze credits remaining");
    }

    await ctx.db.patch(args.streakId, {
      freezeCreditsRemaining: credits - 1,
    });

    return null;
  },
});
