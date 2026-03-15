import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// ============================================================================
// listByMember — list all notes for a specific member (coach+)
// ============================================================================

export const listByMember = tenantQuery({
  args: {
    memberId: v.id("memberships"),
  },
  returns: v.array(
    v.object({
      _id: v.id("member_notes"),
      _creationTime: v.number(),
      tenantId: v.id("tenants"),
      memberId: v.id("memberships"),
      authorId: v.id("users"),
      content: v.string(),
      createdAt: v.number(),
      updatedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    return await ctx.db
      .query("member_notes")
      .withIndex("by_tenantId_memberId", (q) =>
        q.eq("tenantId", ctx.tenantId).eq("memberId", args.memberId)
      )
      .collect();
  },
});

// ============================================================================
// create — create a note for a member (coach+)
// ============================================================================

export const create = tenantMutation({
  args: {
    memberId: v.id("memberships"),
    content: v.string(),
  },
  returns: v.id("member_notes"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    return await ctx.db.insert("member_notes", {
      tenantId: ctx.tenantId,
      memberId: args.memberId,
      authorId: ctx.userId,
      content: args.content,
      createdAt: Date.now(),
    });
  },
});

// ============================================================================
// update — edit a note (coach+, only original author)
// ============================================================================

export const update = tenantMutation({
  args: {
    noteId: v.id("member_notes"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const note = await ctx.db.get(args.noteId);
    if (!note || note.tenantId !== ctx.tenantId) {
      throw new ConvexError("Note not found");
    }

    if (note.authorId !== ctx.userId) {
      throw new ConvexError("Only the original author can edit this note");
    }

    await ctx.db.patch(args.noteId, {
      content: args.content,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// ============================================================================
// remove — delete a note (coach+)
// ============================================================================

export const remove = tenantMutation({
  args: {
    noteId: v.id("member_notes"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const note = await ctx.db.get(args.noteId);
    if (!note || note.tenantId !== ctx.tenantId) {
      throw new ConvexError("Note not found");
    }

    await ctx.db.delete(args.noteId);
    return null;
  },
});
