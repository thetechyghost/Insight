import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// ============================================================================
// Return validators
// ============================================================================

const announcementValidator = v.object({
  _id: v.id("announcement_posts"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  authorId: v.id("users"),
  content: v.string(),
  isPinned: v.boolean(),
  visibility: v.union(
    v.literal("all_members"), v.literal("coaches_only"), v.literal("staff_only")
  ),
  expiryDate: v.optional(v.number()),
});

// ============================================================================
// list — list announcements, filtered by the user's role visibility
// ============================================================================

export const list = tenantQuery({
  args: {},
  returns: v.array(announcementValidator),
  handler: async (ctx) => {
    const all = await ctx.db
      .query("announcement_posts")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .order("desc")
      .collect();

    return all.filter((a) => {
      if (a.visibility === "all_members") return true;
      if (a.visibility === "coaches_only") {
        return ctx.role === "coach" || ctx.role === "admin" || ctx.role === "owner" || ctx.role === "super_admin";
      }
      if (a.visibility === "staff_only") {
        return ctx.role === "admin" || ctx.role === "owner" || ctx.role === "super_admin";
      }
      return false;
    });
  },
});

// ============================================================================
// getById — get a single announcement by ID
// ============================================================================

export const getById = tenantQuery({
  args: { announcementId: v.id("announcement_posts") },
  returns: announcementValidator,
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.announcementId);
    if (!post || post.tenantId !== ctx.tenantId) {
      throw new ConvexError("Announcement not found");
    }
    return post;
  },
});

// ============================================================================
// create — create a new announcement (coach+)
// ============================================================================

export const create = tenantMutation({
  args: {
    content: v.string(),
    visibility: v.union(
      v.literal("all_members"), v.literal("coaches_only"), v.literal("staff_only")
    ),
    expiryDate: v.optional(v.number()),
  },
  returns: v.id("announcement_posts"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    return await ctx.db.insert("announcement_posts", {
      tenantId: ctx.tenantId,
      authorId: ctx.userId,
      content: args.content,
      isPinned: false,
      visibility: args.visibility,
      expiryDate: args.expiryDate,
    });
  },
});

// ============================================================================
// update — update an announcement (coach+)
// ============================================================================

export const update = tenantMutation({
  args: {
    announcementId: v.id("announcement_posts"),
    content: v.optional(v.string()),
    visibility: v.optional(v.union(
      v.literal("all_members"), v.literal("coaches_only"), v.literal("staff_only")
    )),
    expiryDate: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const post = await ctx.db.get(args.announcementId);
    if (!post || post.tenantId !== ctx.tenantId) {
      throw new ConvexError("Announcement not found");
    }

    const updates: Record<string, unknown> = {};
    if (args.content !== undefined) updates.content = args.content;
    if (args.visibility !== undefined) updates.visibility = args.visibility;
    if (args.expiryDate !== undefined) updates.expiryDate = args.expiryDate;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.announcementId, updates);
    }
    return null;
  },
});

// ============================================================================
// pin — pin an announcement (coach+)
// ============================================================================

export const pin = tenantMutation({
  args: { announcementId: v.id("announcement_posts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const post = await ctx.db.get(args.announcementId);
    if (!post || post.tenantId !== ctx.tenantId) {
      throw new ConvexError("Announcement not found");
    }

    await ctx.db.patch(args.announcementId, { isPinned: true });
    return null;
  },
});

// ============================================================================
// unpin — unpin an announcement (coach+)
// ============================================================================

export const unpin = tenantMutation({
  args: { announcementId: v.id("announcement_posts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const post = await ctx.db.get(args.announcementId);
    if (!post || post.tenantId !== ctx.tenantId) {
      throw new ConvexError("Announcement not found");
    }

    await ctx.db.patch(args.announcementId, { isPinned: false });
    return null;
  },
});

// ============================================================================
// remove — delete an announcement (coach+)
// ============================================================================

export const remove = tenantMutation({
  args: { announcementId: v.id("announcement_posts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const post = await ctx.db.get(args.announcementId);
    if (!post || post.tenantId !== ctx.tenantId) {
      throw new ConvexError("Announcement not found");
    }

    await ctx.db.delete(args.announcementId);
    return null;
  },
});
