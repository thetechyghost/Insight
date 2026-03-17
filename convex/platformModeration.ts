import { v, ConvexError } from "convex/values";
import { platformQuery, platformMutation } from "./lib/platformFunctions";

const statusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("removed")
);

const moderationDoc = v.object({
  _id: v.id("moderation_queue"),
  _creationTime: v.number(),
  contentType: v.union(v.literal("post"), v.literal("comment"), v.literal("media")),
  contentId: v.string(),
  tenantId: v.id("tenants"),
  reportedBy: v.optional(v.id("users")),
  reason: v.string(),
  status: statusValidator,
  reviewedBy: v.optional(v.id("users")),
  reviewedAt: v.optional(v.number()),
});

// ============================================================================
// list — list moderation queue items, optionally filtered by status
// ============================================================================

export const list = platformQuery({
  args: { status: v.optional(statusValidator) },
  returns: v.array(moderationDoc),
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("moderation_queue")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    }
    return await ctx.db.query("moderation_queue").collect();
  },
});

// ============================================================================
// approve — mark content as approved
// ============================================================================

export const approve = platformMutation({
  args: { itemId: v.id("moderation_queue") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new ConvexError("Moderation item not found");
    await ctx.db.patch(args.itemId, {
      status: "approved",
      reviewedBy: ctx.userId,
      reviewedAt: Date.now(),
    });
    return null;
  },
});

// ============================================================================
// remove — mark content for removal
// ============================================================================

export const remove = platformMutation({
  args: { itemId: v.id("moderation_queue") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new ConvexError("Moderation item not found");
    await ctx.db.patch(args.itemId, {
      status: "removed",
      reviewedBy: ctx.userId,
      reviewedAt: Date.now(),
    });
    return null;
  },
});

// ============================================================================
// flag — submit content for moderation review
// ============================================================================

export const flag = platformMutation({
  args: {
    contentType: v.union(v.literal("post"), v.literal("comment"), v.literal("media")),
    contentId: v.string(),
    tenantId: v.id("tenants"),
    reportedBy: v.optional(v.id("users")),
    reason: v.string(),
  },
  returns: v.id("moderation_queue"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("moderation_queue", {
      ...args,
      status: "pending",
    });
  },
});
