import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation } from "./lib/customFunctions";

// ============================================================================
// Return validators
// ============================================================================

const messageValidator = v.object({
  _id: v.id("messages"),
  _creationTime: v.number(),
  conversationId: v.id("conversations"),
  senderId: v.id("users"),
  content: v.string(),
  attachments: v.optional(v.array(v.id("_storage"))),
  readReceipts: v.optional(v.any()),
  timestamp: v.number(),
});

// ============================================================================
// Helper — verify the current user is a participant in the conversation
// ============================================================================

async function verifyParticipant(
  ctx: { db: any; userId: any; tenantId: any },
  conversationId: any
) {
  const conv = await ctx.db.get(conversationId);
  if (!conv || conv.tenantId !== ctx.tenantId) {
    throw new ConvexError("Conversation not found");
  }
  if (!conv.participantIds.includes(ctx.userId)) {
    throw new ConvexError("You are not a participant in this conversation");
  }
  return conv;
}

// ============================================================================
// listByConversation — list messages in a conversation (newest first)
// ============================================================================

export const listByConversation = tenantQuery({
  args: { conversationId: v.id("conversations") },
  returns: v.array(messageValidator),
  handler: async (ctx, args) => {
    await verifyParticipant(ctx, args.conversationId);

    return await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q: any) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("desc")
      .collect();
  },
});

// ============================================================================
// send — send a message in a conversation
// ============================================================================

export const send = tenantMutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    attachments: v.optional(v.array(v.id("_storage"))),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    await verifyParticipant(ctx, args.conversationId);

    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: ctx.userId,
      content: args.content,
      attachments: args.attachments,
      timestamp: now,
    });

    await ctx.db.patch(args.conversationId, {
      lastMessageTimestamp: now,
    });

    return messageId;
  },
});

// ============================================================================
// markRead — mark a message as read by the current user
// ============================================================================

export const markRead = tenantMutation({
  args: { messageId: v.id("messages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId);
    if (!msg) {
      throw new ConvexError("Message not found");
    }

    await verifyParticipant(ctx, msg.conversationId);

    const receipts: Record<string, number> = (msg.readReceipts as Record<string, number>) ?? {};
    if (!(ctx.userId in receipts)) {
      receipts[ctx.userId] = Date.now();
      await ctx.db.patch(args.messageId, { readReceipts: receipts });
    }

    return null;
  },
});

// ============================================================================
// search — search messages in a conversation by query string
// ============================================================================

export const search = tenantQuery({
  args: {
    conversationId: v.id("conversations"),
    query: v.string(),
  },
  returns: v.array(messageValidator),
  handler: async (ctx, args) => {
    await verifyParticipant(ctx, args.conversationId);

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q: any) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    const lowerQuery = args.query.toLowerCase();
    return messages.filter((m) => m.content.toLowerCase().includes(lowerQuery));
  },
});
