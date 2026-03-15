import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation } from "./lib/customFunctions";

// ============================================================================
// Return validators
// ============================================================================

const reactionValidator = v.object({
  _id: v.id("reactions"),
  _creationTime: v.number(),
  feedItemId: v.id("activity_feed"),
  userId: v.id("users"),
  emoji: v.string(),
});

// ============================================================================
// listByItem — list all reactions for a feed item
// ============================================================================

export const listByItem = tenantQuery({
  args: { feedItemId: v.id("activity_feed") },
  returns: v.array(reactionValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reactions")
      .withIndex("by_feedItemId", (q) => q.eq("feedItemId", args.feedItemId))
      .collect();
  },
});

// ============================================================================
// toggle — add or remove a reaction (same user + item + emoji = remove)
// ============================================================================

export const toggle = tenantMutation({
  args: {
    feedItemId: v.id("activity_feed"),
    emoji: v.string(),
  },
  returns: v.union(v.id("reactions"), v.null()),
  handler: async (ctx, args) => {
    // Check if this user already reacted with this emoji on this item
    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_feedItemId", (q) => q.eq("feedItemId", args.feedItemId))
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), ctx.userId),
          q.eq(q.field("emoji"), args.emoji)
        )
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return null;
    }

    return await ctx.db.insert("reactions", {
      feedItemId: args.feedItemId,
      userId: ctx.userId,
      emoji: args.emoji,
    });
  },
});
