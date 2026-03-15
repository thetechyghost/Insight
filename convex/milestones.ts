import { v, ConvexError } from "convex/values";
import { tenantQuery } from "./lib/customFunctions";
import { internalMutation } from "./_generated/server";

// ============================================================================
// Return validators
// ============================================================================

const milestoneValidator = v.object({
  _id: v.id("milestones"),
  _creationTime: v.number(),
  type: v.string(),
  thresholds: v.array(v.number()),
  description: v.optional(v.string()),
  name: v.string(),
});

const achievementValidator = v.object({
  _id: v.id("milestone_achievements"),
  _creationTime: v.number(),
  milestoneId: v.id("milestones"),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  achievedAt: v.number(),
  thresholdReached: v.optional(v.number()),
});

// ============================================================================
// list — list all milestones (platform-defined, no tenant filter needed)
// ============================================================================

export const list = tenantQuery({
  args: {},
  returns: v.array(milestoneValidator),
  handler: async (ctx) => {
    return await ctx.db.query("milestones").collect();
  },
});

// ============================================================================
// create — create a platform-defined milestone (internal)
// ============================================================================

export const create = internalMutation({
  args: {
    type: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    thresholds: v.array(v.number()),
  },
  returns: v.id("milestones"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("milestones", {
      type: args.type,
      name: args.name,
      description: args.description,
      thresholds: args.thresholds,
    });
  },
});

// ============================================================================
// checkAndAward — check milestones of a given type and award if threshold met
// ============================================================================

export const checkAndAward = internalMutation({
  args: {
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    type: v.string(),
    currentValue: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get all milestones of this type
    const milestones = await ctx.db.query("milestones").collect();
    const relevant = milestones.filter((m) => m.type === args.type);

    // Get existing achievements for this user in this tenant
    const achievements = await ctx.db
      .query("milestone_achievements")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", args.userId).eq("tenantId", args.tenantId)
      )
      .collect();

    for (const milestone of relevant) {
      for (const threshold of milestone.thresholds) {
        if (args.currentValue >= threshold) {
          // Check if already awarded for this milestone + threshold
          const alreadyAwarded = achievements.some(
            (a) =>
              a.milestoneId === milestone._id &&
              a.thresholdReached === threshold
          );

          if (!alreadyAwarded) {
            await ctx.db.insert("milestone_achievements", {
              milestoneId: milestone._id,
              userId: args.userId,
              tenantId: args.tenantId,
              achievedAt: Date.now(),
              thresholdReached: threshold,
            });
          }
        }
      }
    }

    return null;
  },
});

// ============================================================================
// getMyAchievements — list achievements for the current user in this tenant
// ============================================================================

export const getMyAchievements = tenantQuery({
  args: {},
  returns: v.array(achievementValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("milestone_achievements")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .collect();
  },
});
