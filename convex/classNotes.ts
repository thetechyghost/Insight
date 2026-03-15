import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// --- Return validator ---

const classNoteValidator = v.object({
  _id: v.id("class_notes"),
  _creationTime: v.number(),
  classSessionId: v.id("class_sessions"),
  tenantId: v.id("tenants"),
  content: v.string(),
  coachId: v.id("users"),
});

// ============================================================================
// getBySession — get the note for a class session (returns first match)
// ============================================================================

export const getBySession = tenantQuery({
  args: {
    classSessionId: v.id("class_sessions"),
  },
  returns: v.union(classNoteValidator, v.null()),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.classSessionId);
    if (!session || session.tenantId !== ctx.tenantId) {
      throw new ConvexError("Class session not found");
    }

    const note = await ctx.db
      .query("class_notes")
      .withIndex("by_classSessionId", (q) =>
        q.eq("classSessionId", args.classSessionId)
      )
      .first();

    return note;
  },
});

// ============================================================================
// create — create a note for a class session (coach+)
// ============================================================================

export const create = tenantMutation({
  args: {
    classSessionId: v.id("class_sessions"),
    content: v.string(),
  },
  returns: v.id("class_notes"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const session = await ctx.db.get(args.classSessionId);
    if (!session || session.tenantId !== ctx.tenantId) {
      throw new ConvexError("Class session not found");
    }

    return await ctx.db.insert("class_notes", {
      classSessionId: args.classSessionId,
      tenantId: ctx.tenantId,
      content: args.content,
      coachId: ctx.userId,
    });
  },
});

// ============================================================================
// update — update a class note (coach+)
// ============================================================================

export const update = tenantMutation({
  args: {
    noteId: v.id("class_notes"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const note = await ctx.db.get(args.noteId);
    if (!note || note.tenantId !== ctx.tenantId) {
      throw new ConvexError("Class note not found");
    }

    await ctx.db.patch(args.noteId, {
      content: args.content,
    });

    return null;
  },
});
