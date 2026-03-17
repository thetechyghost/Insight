import { v, ConvexError } from "convex/values";
import { platformQuery, platformMutation } from "./lib/platformFunctions";
import { internal } from "./_generated/api";

const priorityValidator = v.union(
  v.literal("info"),
  v.literal("warning"),
  v.literal("critical")
);

const statusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived")
);

// ============================================================================
// list — list announcements with optional status filter
// ============================================================================

export const list = platformQuery({
  args: {
    status: v.optional(statusValidator),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    let announcements;

    if (args.status) {
      announcements = await ctx.db
        .query("platform_announcements")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else {
      announcements = await ctx.db
        .query("platform_announcements")
        .order("desc")
        .collect();
    }

    return announcements;
  },
});

// ============================================================================
// getById — single announcement
// ============================================================================

export const getById = platformQuery({
  args: { announcementId: v.id("platform_announcements") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const announcement = await ctx.db.get(args.announcementId);
    if (!announcement) throw new ConvexError("Announcement not found");
    return announcement;
  },
});

// ============================================================================
// create — create a new announcement (draft)
// ============================================================================

export const create = platformMutation({
  args: {
    title: v.string(),
    content: v.string(),
    priority: priorityValidator,
    targetTenantIds: v.optional(v.array(v.id("tenants"))),
    expiresAt: v.optional(v.number()),
  },
  returns: v.id("platform_announcements"),
  handler: async (ctx, args) => {
    if (!args.title.trim()) {
      throw new ConvexError("Announcement title cannot be empty");
    }
    if (!args.content.trim()) {
      throw new ConvexError("Announcement content cannot be empty");
    }

    const announcementId = await ctx.db.insert("platform_announcements", {
      title: args.title,
      content: args.content,
      priority: args.priority,
      targetTenantIds: args.targetTenantIds,
      expiresAt: args.expiresAt,
      status: "draft",
      createdBy: ctx.userId,
    });

    await ctx.scheduler.runAfter(0, internal.platformAuditLog.create, {
      actorId: ctx.userId,
      action: "announcement.created",
      targetEntity: "platform_announcements",
      targetId: announcementId as string,
      afterValue: { title: args.title, priority: args.priority },
    });

    return announcementId;
  },
});

// ============================================================================
// update — update an announcement
// ============================================================================

export const update = platformMutation({
  args: {
    announcementId: v.id("platform_announcements"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    priority: v.optional(priorityValidator),
    targetTenantIds: v.optional(v.array(v.id("tenants"))),
    expiresAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const announcement = await ctx.db.get(args.announcementId);
    if (!announcement) throw new ConvexError("Announcement not found");

    const { announcementId, ...patch } = args;
    const cleanPatch = Object.fromEntries(
      Object.entries(patch).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(announcementId, cleanPatch);

    await ctx.scheduler.runAfter(0, internal.platformAuditLog.create, {
      actorId: ctx.userId,
      action: "announcement.updated",
      targetEntity: "platform_announcements",
      targetId: announcementId as string,
      afterValue: cleanPatch,
    });

    return null;
  },
});

// ============================================================================
// publish — publish a draft announcement
// ============================================================================

export const publish = platformMutation({
  args: { announcementId: v.id("platform_announcements") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const announcement = await ctx.db.get(args.announcementId);
    if (!announcement) throw new ConvexError("Announcement not found");
    if (announcement.status === "published") {
      throw new ConvexError("Announcement is already published");
    }
    if (announcement.status === "archived") {
      throw new ConvexError("Cannot publish an archived announcement");
    }

    await ctx.db.patch(args.announcementId, {
      status: "published",
      publishedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.platformAuditLog.create, {
      actorId: ctx.userId,
      action: "announcement.published",
      targetEntity: "platform_announcements",
      targetId: args.announcementId as string,
    });

    return null;
  },
});

// ============================================================================
// archive — archive a published announcement
// ============================================================================

export const archive = platformMutation({
  args: { announcementId: v.id("platform_announcements") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const announcement = await ctx.db.get(args.announcementId);
    if (!announcement) throw new ConvexError("Announcement not found");

    await ctx.db.patch(args.announcementId, { status: "archived" });

    await ctx.scheduler.runAfter(0, internal.platformAuditLog.create, {
      actorId: ctx.userId,
      action: "announcement.archived",
      targetEntity: "platform_announcements",
      targetId: args.announcementId as string,
    });

    return null;
  },
});

// ============================================================================
// remove — delete a draft announcement
// ============================================================================

export const remove = platformMutation({
  args: { announcementId: v.id("platform_announcements") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const announcement = await ctx.db.get(args.announcementId);
    if (!announcement) throw new ConvexError("Announcement not found");
    if (announcement.status !== "draft") {
      throw new ConvexError("Only draft announcements can be deleted");
    }

    await ctx.db.delete(args.announcementId);

    await ctx.scheduler.runAfter(0, internal.platformAuditLog.create, {
      actorId: ctx.userId,
      action: "announcement.deleted",
      targetEntity: "platform_announcements",
      targetId: args.announcementId as string,
      beforeValue: { title: announcement.title },
    });

    return null;
  },
});
