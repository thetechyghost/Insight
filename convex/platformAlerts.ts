import { v } from "convex/values";
import { platformQuery, platformMutation } from "./lib/platformFunctions";

const thresholdsValidator = v.object({
  lowActivityDays: v.number(),
  maxErrorRate: v.number(),
  minMemberCount: v.number(),
});

// ============================================================================
// getThresholds — read alert threshold config (FR-AD-013 stub)
// ============================================================================

export const getThresholds = platformQuery({
  args: {},
  returns: v.union(thresholdsValidator, v.null()),
  handler: async (ctx) => {
    const config = await ctx.db
      .query("platform_config")
      .withIndex("by_key", (q) => q.eq("key", "alert_thresholds"))
      .unique();

    if (!config) return null;
    return config.value as { lowActivityDays: number; maxErrorRate: number; minMemberCount: number };
  },
});

// ============================================================================
// setThresholds — write alert threshold config
// ============================================================================

export const setThresholds = platformMutation({
  args: {
    lowActivityDays: v.number(),
    maxErrorRate: v.number(),
    minMemberCount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("platform_config")
      .withIndex("by_key", (q) => q.eq("key", "alert_thresholds"))
      .unique();

    const value = {
      lowActivityDays: args.lowActivityDays,
      maxErrorRate: args.maxErrorRate,
      minMemberCount: args.minMemberCount,
    };

    if (existing) {
      await ctx.db.patch(existing._id, { value });
    } else {
      await ctx.db.insert("platform_config", {
        key: "alert_thresholds",
        value,
      });
    }

    return null;
  },
});
