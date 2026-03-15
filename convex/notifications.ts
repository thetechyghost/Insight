import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation } from "./lib/customFunctions";
import { internalMutation, internalAction } from "./_generated/server";

// ============================================================================
// Return validators
// ============================================================================

const notificationValidator = v.object({
  _id: v.id("notification_queue"),
  _creationTime: v.number(),
  userId: v.id("users"),
  type: v.union(v.literal("push"), v.literal("email"), v.literal("sms"), v.literal("in_app")),
  templateId: v.optional(v.id("notification_templates")),
  payload: v.any(),
  status: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed"), v.literal("read")),
  scheduledSendTime: v.optional(v.number()),
});

// ============================================================================
// listMine — list the current user's in-app notifications
// ============================================================================

export const listMine = tenantQuery({
  args: {},
  returns: v.array(notificationValidator),
  handler: async (ctx) => {
    const all = await ctx.db
      .query("notification_queue")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.userId))
      .order("desc")
      .collect();

    return all.filter((n) => n.type === "in_app");
  },
});

// ============================================================================
// markRead — mark a single notification as read
// ============================================================================

export const markRead = tenantMutation({
  args: { notificationId: v.id("notification_queue") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const notif = await ctx.db.get(args.notificationId);
    if (!notif || notif.userId !== ctx.userId) {
      throw new ConvexError("Notification not found");
    }

    await ctx.db.patch(args.notificationId, { status: "read" });
    return null;
  },
});

// ============================================================================
// markAllRead — mark all unread notifications as read for the current user
// ============================================================================

export const markAllRead = tenantMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const unread = await ctx.db
      .query("notification_queue")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", ctx.userId).eq("status", "pending")
      )
      .collect();

    for (const notif of unread) {
      if (notif.type === "in_app") {
        await ctx.db.patch(notif._id, { status: "read" });
      }
    }
    return null;
  },
});

// ============================================================================
// dismiss — delete a notification
// ============================================================================

export const dismiss = tenantMutation({
  args: { notificationId: v.id("notification_queue") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const notif = await ctx.db.get(args.notificationId);
    if (!notif || notif.userId !== ctx.userId) {
      throw new ConvexError("Notification not found");
    }

    await ctx.db.delete(args.notificationId);
    return null;
  },
});

// ============================================================================
// dispatch — internal: insert a notification into the queue
// ============================================================================

export const dispatch = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.union(v.literal("push"), v.literal("email"), v.literal("sms"), v.literal("in_app")),
    payload: v.object({
      title: v.string(),
      body: v.string(),
      data: v.optional(v.any()),
    }),
    templateId: v.optional(v.id("notification_templates")),
    scheduledSendTime: v.optional(v.number()),
  },
  returns: v.id("notification_queue"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("notification_queue", {
      userId: args.userId,
      type: args.type,
      payload: args.payload,
      templateId: args.templateId,
      status: "pending",
      scheduledSendTime: args.scheduledSendTime,
    });
  },
});

// ============================================================================
// sendPush — internal: placeholder for push notification delivery
// ============================================================================

export const sendPush = internalAction({
  args: { notificationId: v.id("notification_queue") },
  returns: v.null(),
  handler: async (_ctx, args) => {
    // Placeholder: integrate with push notification provider (e.g., Expo, FCM)
    console.log(`[sendPush] Would send push notification: ${args.notificationId}`);
    return null;
  },
});

// ============================================================================
// sendEmail — internal: placeholder for email delivery
// ============================================================================

export const sendEmail = internalAction({
  args: { notificationId: v.id("notification_queue") },
  returns: v.null(),
  handler: async (_ctx, args) => {
    // Placeholder: integrate with email provider (e.g., Resend, SendGrid)
    console.log(`[sendEmail] Would send email notification: ${args.notificationId}`);
    return null;
  },
});

// ============================================================================
// sendSms — internal: placeholder for SMS delivery
// ============================================================================

export const sendSms = internalAction({
  args: { notificationId: v.id("notification_queue") },
  returns: v.null(),
  handler: async (_ctx, args) => {
    // Placeholder: integrate with SMS provider (e.g., Twilio)
    console.log(`[sendSms] Would send SMS notification: ${args.notificationId}`);
    return null;
  },
});
