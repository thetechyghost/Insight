import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// --- Return validator ---

const coachNoteValidator = v.object({
  _id: v.id("coach_notes"),
  _creationTime: v.number(),
  coachId: v.id("users"),
  athleteId: v.id("users"),
  tenantId: v.id("tenants"),
  content: v.string(),
});

// ============================================================================
// listByAthlete — list coach notes for an athlete (coach+)
// ============================================================================

export const listByAthlete = tenantQuery({
  args: {
    athleteId: v.id("users"),
  },
  returns: v.array(coachNoteValidator),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    return await ctx.db
      .query("coach_notes")
      .withIndex("by_tenantId_athleteId", (q) =>
        q.eq("tenantId", ctx.tenantId).eq("athleteId", args.athleteId)
      )
      .collect();
  },
});

// ============================================================================
// create — create a coach note for an athlete (coach+)
// ============================================================================

export const create = tenantMutation({
  args: {
    athleteId: v.id("users"),
    content: v.string(),
  },
  returns: v.id("coach_notes"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    return await ctx.db.insert("coach_notes", {
      coachId: ctx.userId,
      athleteId: args.athleteId,
      tenantId: ctx.tenantId,
      content: args.content,
    });
  },
});

// ============================================================================
// update — update a coach note (coach+, only original author)
// ============================================================================

export const update = tenantMutation({
  args: {
    noteId: v.id("coach_notes"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const note = await ctx.db.get(args.noteId);
    if (!note || note.tenantId !== ctx.tenantId) {
      throw new ConvexError("Coach note not found");
    }

    if (note.coachId !== ctx.userId) {
      throw new ConvexError("Only the original author can edit this note");
    }

    await ctx.db.patch(args.noteId, {
      content: args.content,
    });

    return null;
  },
});

// ============================================================================
// remove — delete a coach note (coach+, only original author)
// ============================================================================

export const remove = tenantMutation({
  args: {
    noteId: v.id("coach_notes"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const note = await ctx.db.get(args.noteId);
    if (!note || note.tenantId !== ctx.tenantId) {
      throw new ConvexError("Coach note not found");
    }

    if (note.coachId !== ctx.userId) {
      throw new ConvexError("Only the original author can delete this note");
    }

    await ctx.db.delete(args.noteId);

    return null;
  },
});
