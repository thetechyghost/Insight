import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// ============================================================================
// Local validators
// ============================================================================

const difficultyLevelValidator = v.union(
  v.literal("beginner"),
  v.literal("intermediate"),
  v.literal("advanced")
);

// ============================================================================
// Return validators
// ============================================================================

const educationalContentValidator = v.object({
  _id: v.id("educational_content"),
  _creationTime: v.number(),
  tenantId: v.optional(v.id("tenants")),
  title: v.string(),
  body: v.string(),
  category: v.optional(v.string()),
  tags: v.array(v.string()),
  difficultyLevel: v.optional(difficultyLevelValidator),
});

// ============================================================================
// list — list educational content (platform-wide + tenant), optional category filter
// ============================================================================

export const list = tenantQuery({
  args: {
    category: v.optional(v.string()),
  },
  returns: v.array(educationalContentValidator),
  handler: async (ctx, args) => {
    // Get tenant-specific content
    const tenantContent = await ctx.db
      .query("educational_content")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();

    // Get platform-wide content (tenantId is undefined)
    const platformContent = await ctx.db
      .query("educational_content")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", undefined))
      .collect();

    let combined = [...platformContent, ...tenantContent];

    if (args.category !== undefined) {
      combined = combined.filter((c) => c.category === args.category);
    }

    return combined;
  },
});

// ============================================================================
// getById — get a single piece of educational content (platform or tenant)
// ============================================================================

export const getById = tenantQuery({
  args: { contentId: v.id("educational_content") },
  returns: educationalContentValidator,
  handler: async (ctx, args) => {
    const content = await ctx.db.get(args.contentId);
    if (!content) {
      throw new ConvexError("Educational content not found");
    }

    // Allow platform content (tenantId undefined) or content belonging to the tenant
    if (content.tenantId !== undefined && content.tenantId !== ctx.tenantId) {
      throw new ConvexError("Educational content not found");
    }

    return content;
  },
});

// ============================================================================
// search — case-insensitive search across title, body, and tags (max 20)
// ============================================================================

export const search = tenantQuery({
  args: { query: v.string() },
  returns: v.array(educationalContentValidator),
  handler: async (ctx, args) => {
    const tenantContent = await ctx.db
      .query("educational_content")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();

    const platformContent = await ctx.db
      .query("educational_content")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", undefined))
      .collect();

    const combined = [...platformContent, ...tenantContent];
    const queryLower = args.query.toLowerCase();

    const matches = combined.filter((c) => {
      if (c.title.toLowerCase().includes(queryLower)) return true;
      if (c.body.toLowerCase().includes(queryLower)) return true;
      if (c.tags?.some((tag: string) => tag.toLowerCase().includes(queryLower))) return true;
      return false;
    });

    return matches.slice(0, 20);
  },
});

// ============================================================================
// create — create educational content (coach+)
// ============================================================================

export const create = tenantMutation({
  args: {
    title: v.string(),
    body: v.string(),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    difficultyLevel: v.optional(difficultyLevelValidator),
  },
  returns: v.id("educational_content"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const { tags, ...rest } = args;
    return await ctx.db.insert("educational_content", {
      tenantId: ctx.tenantId,
      tags: tags ?? [],
      ...rest,
    });
  },
});

// ============================================================================
// update — update educational content (coach+, tenant-owned only)
// ============================================================================

export const update = tenantMutation({
  args: {
    contentId: v.id("educational_content"),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    difficultyLevel: v.optional(difficultyLevelValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const content = await ctx.db.get(args.contentId);
    if (!content) {
      throw new ConvexError("Educational content not found");
    }
    if (content.tenantId !== ctx.tenantId) {
      throw new ConvexError("Can only update tenant-owned content");
    }

    const { contentId: _id, ...updates } = args;
    await ctx.db.patch(args.contentId, updates);

    return null;
  },
});

// ============================================================================
// remove — delete educational content (coach+, tenant-owned only)
// ============================================================================

export const remove = tenantMutation({
  args: { contentId: v.id("educational_content") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const content = await ctx.db.get(args.contentId);
    if (!content) {
      throw new ConvexError("Educational content not found");
    }
    if (content.tenantId !== ctx.tenantId) {
      throw new ConvexError("Can only delete tenant-owned content");
    }

    await ctx.db.delete(args.contentId);
    return null;
  },
});
