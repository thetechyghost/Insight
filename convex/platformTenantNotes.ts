import { v, ConvexError } from "convex/values";
import { platformQuery, platformMutation } from "./lib/platformFunctions";

const noteDoc = v.object({
  _id: v.id("platform_tenant_notes"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  authorId: v.id("users"),
  content: v.string(),
  updatedAt: v.optional(v.number()),
});

// ============================================================================
// listByTenant — list notes for a tenant
// ============================================================================

export const listByTenant = platformQuery({
  args: { tenantId: v.id("tenants") },
  returns: v.array(noteDoc),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("platform_tenant_notes")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .collect();
  },
});

// ============================================================================
// create — add a new note
// ============================================================================

export const create = platformMutation({
  args: {
    tenantId: v.id("tenants"),
    content: v.string(),
  },
  returns: v.id("platform_tenant_notes"),
  handler: async (ctx, args) => {
    if (!args.content.trim()) {
      throw new ConvexError("Note content cannot be empty");
    }
    return await ctx.db.insert("platform_tenant_notes", {
      tenantId: args.tenantId,
      authorId: ctx.userId,
      content: args.content,
    });
  },
});

// ============================================================================
// update — update note content
// ============================================================================

export const update = platformMutation({
  args: {
    noteId: v.id("platform_tenant_notes"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) throw new ConvexError("Note not found");
    await ctx.db.patch(args.noteId, {
      content: args.content,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// ============================================================================
// remove — delete a note
// ============================================================================

export const remove = platformMutation({
  args: { noteId: v.id("platform_tenant_notes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) throw new ConvexError("Note not found");
    await ctx.db.delete(args.noteId);
    return null;
  },
});
