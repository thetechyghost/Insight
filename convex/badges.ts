import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation } from "./lib/customFunctions";
import { internalMutation } from "./_generated/server";

// ============================================================================
// Local validators
// ============================================================================

const badgeCategoryValidator = v.union(
  v.literal("movement"),
  v.literal("consistency"),
  v.literal("community"),
  v.literal("competition")
);

const rarityValidator = v.optional(
  v.union(
    v.literal("common"),
    v.literal("uncommon"),
    v.literal("rare"),
    v.literal("epic"),
    v.literal("legendary")
  )
);

// ============================================================================
// Return validators
// ============================================================================

const badgeValidator = v.object({
  _id: v.id("badges"),
  _creationTime: v.number(),
  name: v.string(),
  iconStorageId: v.optional(v.id("_storage")),
  description: v.string(),
  category: badgeCategoryValidator,
  criteria: v.any(),
  rarityTier: rarityValidator,
});

const userBadgeValidator = v.object({
  _id: v.id("user_badges"),
  _creationTime: v.number(),
  badgeId: v.id("badges"),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  earnedAt: v.number(),
});

const userBadgeWithDetailsValidator = v.object({
  _id: v.id("user_badges"),
  _creationTime: v.number(),
  badgeId: v.id("badges"),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  earnedAt: v.number(),
  badge: v.union(badgeValidator, v.null()),
});

// ============================================================================
// list — list all badges (platform-defined)
// ============================================================================

export const list = tenantQuery({
  args: {},
  returns: v.array(badgeValidator),
  handler: async (ctx) => {
    return await ctx.db.query("badges").collect();
  },
});

// ============================================================================
// getById — get a single badge
// ============================================================================

export const getById = tenantQuery({
  args: { badgeId: v.id("badges") },
  returns: badgeValidator,
  handler: async (ctx, args) => {
    const badge = await ctx.db.get(args.badgeId);
    if (!badge) {
      throw new ConvexError("Badge not found");
    }
    return badge;
  },
});

// ============================================================================
// awardBadge — award a badge to a user (internal)
// ============================================================================

export const awardBadge = internalMutation({
  args: {
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    badgeId: v.id("badges"),
  },
  returns: v.id("user_badges"),
  handler: async (ctx, args) => {
    // Check if already awarded
    const existing = await ctx.db
      .query("user_badges")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", args.userId).eq("tenantId", args.tenantId)
      )
      .filter((q) => q.eq(q.field("badgeId"), args.badgeId))
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("user_badges", {
      badgeId: args.badgeId,
      userId: args.userId,
      tenantId: args.tenantId,
      earnedAt: Date.now(),
    });
  },
});

// ============================================================================
// getMyBadges — get current user's badges with badge details
// ============================================================================

export const getMyBadges = tenantQuery({
  args: {},
  returns: v.array(userBadgeWithDetailsValidator),
  handler: async (ctx) => {
    const userBadges = await ctx.db
      .query("user_badges")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", ctx.tenantId)
      )
      .collect();

    return await Promise.all(
      userBadges.map(async (ub) => {
        const badge = await ctx.db.get(ub.badgeId);
        return { ...ub, badge };
      })
    );
  },
});

// ============================================================================
// getUserBadges — get a specific user's badges
// ============================================================================

export const getUserBadges = tenantQuery({
  args: { userId: v.id("users") },
  returns: v.array(userBadgeWithDetailsValidator),
  handler: async (ctx, args) => {
    const userBadges = await ctx.db
      .query("user_badges")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", args.userId).eq("tenantId", ctx.tenantId)
      )
      .collect();

    return await Promise.all(
      userBadges.map(async (ub) => {
        const badge = await ctx.db.get(ub.badgeId);
        return { ...ub, badge };
      })
    );
  },
});
