import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation } from "./lib/customFunctions";

// ============================================================================
// Return validators
// ============================================================================

const conversationValidator = v.object({
  _id: v.id("conversations"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  type: v.union(v.literal("direct"), v.literal("group"), v.literal("class"), v.literal("program")),
  participantIds: v.array(v.id("users")),
  name: v.optional(v.string()),
  lastMessageTimestamp: v.optional(v.number()),
});

// ============================================================================
// listMine — list conversations the current user participates in
// ============================================================================

export const listMine = tenantQuery({
  args: {},
  returns: v.array(conversationValidator),
  handler: async (ctx) => {
    const all = await ctx.db
      .query("conversations")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();

    const mine = all.filter((c) => c.participantIds.includes(ctx.userId));
    mine.sort((a, b) => (b.lastMessageTimestamp ?? 0) - (a.lastMessageTimestamp ?? 0));
    return mine;
  },
});

// ============================================================================
// getById — get a single conversation, verifying the user is a participant
// ============================================================================

export const getById = tenantQuery({
  args: { conversationId: v.id("conversations") },
  returns: conversationValidator,
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.tenantId !== ctx.tenantId) {
      throw new ConvexError("Conversation not found");
    }
    if (!conv.participantIds.includes(ctx.userId)) {
      throw new ConvexError("You are not a participant in this conversation");
    }
    return conv;
  },
});

// ============================================================================
// create — create a new conversation
// ============================================================================

export const create = tenantMutation({
  args: {
    type: v.union(v.literal("direct"), v.literal("group"), v.literal("class"), v.literal("program")),
    participantIds: v.array(v.id("users")),
    name: v.optional(v.string()),
  },
  returns: v.id("conversations"),
  handler: async (ctx, args) => {
    const participants = args.participantIds.includes(ctx.userId)
      ? args.participantIds
      : [...args.participantIds, ctx.userId];

    return await ctx.db.insert("conversations", {
      tenantId: ctx.tenantId,
      type: args.type,
      participantIds: participants,
      name: args.name,
    });
  },
});

// ============================================================================
// addParticipant — add a user to a conversation
// ============================================================================

export const addParticipant = tenantMutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.tenantId !== ctx.tenantId) {
      throw new ConvexError("Conversation not found");
    }
    if (!conv.participantIds.includes(ctx.userId)) {
      throw new ConvexError("You are not a participant in this conversation");
    }
    if (conv.participantIds.includes(args.userId)) {
      return null;
    }

    await ctx.db.patch(args.conversationId, {
      participantIds: [...conv.participantIds, args.userId],
    });
    return null;
  },
});

// ============================================================================
// removeParticipant — remove a user from a conversation
// ============================================================================

export const removeParticipant = tenantMutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.tenantId !== ctx.tenantId) {
      throw new ConvexError("Conversation not found");
    }
    if (!conv.participantIds.includes(ctx.userId)) {
      throw new ConvexError("You are not a participant in this conversation");
    }

    await ctx.db.patch(args.conversationId, {
      participantIds: conv.participantIds.filter((id) => id !== args.userId),
    });
    return null;
  },
});
