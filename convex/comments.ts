import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation } from "./lib/customFunctions";

// ============================================================================
// Return validators
// ============================================================================

const commentValidator = v.object({
  _id: v.id("comments"),
  _creationTime: v.number(),
  feedItemId: v.optional(v.id("activity_feed")),
  parentCommentId: v.optional(v.id("comments")),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  content: v.string(),
});

// ============================================================================
// listByItem — list all comments for a feed item
// ============================================================================

export const listByItem = tenantQuery({
  args: { feedItemId: v.id("activity_feed") },
  returns: v.array(commentValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("comments")
      .withIndex("by_feedItemId", (q) => q.eq("feedItemId", args.feedItemId))
      .collect();
  },
});

// ============================================================================
// create — create a new comment on a feed item
// ============================================================================

export const create = tenantMutation({
  args: {
    feedItemId: v.id("activity_feed"),
    content: v.string(),
    parentCommentId: v.optional(v.id("comments")),
  },
  returns: v.id("comments"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("comments", {
      feedItemId: args.feedItemId,
      parentCommentId: args.parentCommentId,
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      content: args.content,
    });
  },
});

// ============================================================================
// update — update own comment
// ============================================================================

export const update = tenantMutation({
  args: {
    commentId: v.id("comments"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment || comment.userId !== ctx.userId) {
      throw new ConvexError("Comment not found or not owned by you");
    }

    await ctx.db.patch(args.commentId, { content: args.content });
    return null;
  },
});

// ============================================================================
// remove — delete own comment
// ============================================================================

export const remove = tenantMutation({
  args: { commentId: v.id("comments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment || comment.userId !== ctx.userId) {
      throw new ConvexError("Comment not found or not owned by you");
    }

    await ctx.db.delete(args.commentId);
    return null;
  },
});
