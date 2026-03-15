import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation } from "./lib/customFunctions";
import { internalMutation } from "./_generated/server";

// ============================================================================
// Local validators
// ============================================================================

const feedTypeValidator = v.union(
  v.literal("workout_logged"),
  v.literal("pr_achieved"),
  v.literal("challenge_completed"),
  v.literal("milestone"),
  v.literal("badge_earned"),
  v.literal("streak")
);

const visibilityValidator = v.union(
  v.literal("gym"),
  v.literal("friends"),
  v.literal("public"),
  v.literal("private")
);

// ============================================================================
// Return validators
// ============================================================================

const feedItemValidator = v.object({
  _id: v.id("activity_feed"),
  _creationTime: v.number(),
  type: feedTypeValidator,
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  timestamp: v.number(),
  visibility: visibilityValidator,
  linkedEntityId: v.optional(v.string()),
  linkedEntityType: v.optional(v.string()),
  displayData: v.optional(v.any()),
});

// ============================================================================
// getFeed — paginated feed: own items + gym-visible items for this tenant
// ============================================================================

export const getFeed = tenantQuery({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    items: v.array(feedItemValidator),
    nextCursor: v.optional(v.string()),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const pageSize = args.limit ?? 25;

    const results = await ctx.db
      .query("activity_feed")
      .withIndex("by_tenantId_timestamp", (q) => q.eq("tenantId", ctx.tenantId))
      .order("desc")
      .paginate({ numItems: pageSize, cursor: args.cursor ?? null });

    // Filter: show own items (any visibility) + gym-visible items from others
    const filtered = results.page.filter(
      (item) =>
        item.userId === ctx.userId ||
        item.visibility === "gym" ||
        item.visibility === "public"
    );

    return {
      items: filtered,
      nextCursor: results.continueCursor,
      hasMore: !results.isDone,
    };
  },
});

// ============================================================================
// createItem — internal mutation to create a feed item
// ============================================================================

export const createItem = internalMutation({
  args: {
    type: feedTypeValidator,
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    visibility: visibilityValidator,
    linkedEntityId: v.optional(v.string()),
    linkedEntityType: v.optional(v.string()),
    displayData: v.optional(v.any()),
  },
  returns: v.id("activity_feed"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("activity_feed", {
      type: args.type,
      userId: args.userId,
      tenantId: args.tenantId,
      timestamp: Date.now(),
      visibility: args.visibility,
      linkedEntityId: args.linkedEntityId,
      linkedEntityType: args.linkedEntityType,
      displayData: args.displayData,
    });
  },
});

// ============================================================================
// hide — delete own feed item
// ============================================================================

export const hide = tenantMutation({
  args: { feedItemId: v.id("activity_feed") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.feedItemId);
    if (!item || item.userId !== ctx.userId) {
      throw new ConvexError("Feed item not found or not owned by you");
    }
    await ctx.db.delete(args.feedItemId);
    return null;
  },
});

// ============================================================================
// remove — delete own feed item
// ============================================================================

export const remove = tenantMutation({
  args: { feedItemId: v.id("activity_feed") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.feedItemId);
    if (!item || item.userId !== ctx.userId) {
      throw new ConvexError("Feed item not found or not owned by you");
    }
    await ctx.db.delete(args.feedItemId);
    return null;
  },
});
