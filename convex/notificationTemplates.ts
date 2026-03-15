import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";
import { internalMutation } from "./_generated/server";

// ============================================================================
// Return validators
// ============================================================================

const templateValidator = v.object({
  _id: v.id("notification_templates"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  channel: v.union(v.literal("push"), v.literal("email"), v.literal("sms"), v.literal("in_app")),
  triggerEvent: v.string(),
  subject: v.optional(v.string()),
  body: v.string(),
  mergeFields: v.optional(v.array(v.string())),
  enabled: v.boolean(),
});

// ============================================================================
// list — list all notification templates for the tenant
// ============================================================================

export const list = tenantQuery({
  args: {},
  returns: v.array(templateValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("notification_templates")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
  },
});

// ============================================================================
// getByTrigger — get templates for a specific trigger event
// ============================================================================

export const getByTrigger = tenantQuery({
  args: { trigger: v.string() },
  returns: v.array(templateValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notification_templates")
      .withIndex("by_tenantId_triggerEvent", (q) =>
        q.eq("tenantId", ctx.tenantId).eq("triggerEvent", args.trigger)
      )
      .collect();
  },
});

// ============================================================================
// create — create a notification template (owner+)
// ============================================================================

export const create = tenantMutation({
  args: {
    channel: v.union(v.literal("push"), v.literal("email"), v.literal("sms"), v.literal("in_app")),
    triggerEvent: v.string(),
    subject: v.optional(v.string()),
    body: v.string(),
    mergeFields: v.optional(v.array(v.string())),
    enabled: v.boolean(),
  },
  returns: v.id("notification_templates"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");

    return await ctx.db.insert("notification_templates", {
      tenantId: ctx.tenantId,
      channel: args.channel,
      triggerEvent: args.triggerEvent,
      subject: args.subject,
      body: args.body,
      mergeFields: args.mergeFields,
      enabled: args.enabled,
    });
  },
});

// ============================================================================
// update — update a notification template (owner+)
// ============================================================================

export const update = tenantMutation({
  args: {
    templateId: v.id("notification_templates"),
    channel: v.optional(v.union(v.literal("push"), v.literal("email"), v.literal("sms"), v.literal("in_app"))),
    triggerEvent: v.optional(v.string()),
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
    mergeFields: v.optional(v.array(v.string())),
    enabled: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");

    const template = await ctx.db.get(args.templateId);
    if (!template || template.tenantId !== ctx.tenantId) {
      throw new ConvexError("Notification template not found");
    }

    const updates: Record<string, unknown> = {};
    if (args.channel !== undefined) updates.channel = args.channel;
    if (args.triggerEvent !== undefined) updates.triggerEvent = args.triggerEvent;
    if (args.subject !== undefined) updates.subject = args.subject;
    if (args.body !== undefined) updates.body = args.body;
    if (args.mergeFields !== undefined) updates.mergeFields = args.mergeFields;
    if (args.enabled !== undefined) updates.enabled = args.enabled;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.templateId, updates);
    }
    return null;
  },
});

// ============================================================================
// remove — delete a notification template (owner+)
// ============================================================================

export const remove = tenantMutation({
  args: { templateId: v.id("notification_templates") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");

    const template = await ctx.db.get(args.templateId);
    if (!template || template.tenantId !== ctx.tenantId) {
      throw new ConvexError("Notification template not found");
    }

    await ctx.db.delete(args.templateId);
    return null;
  },
});

// ============================================================================
// seedDefaults — internal: create default notification templates for a tenant
// ============================================================================

export const seedDefaults = internalMutation({
  args: { tenantId: v.id("tenants") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const defaults = [
      {
        triggerEvent: "workout_logged",
        channel: "in_app" as const,
        subject: undefined,
        body: "{{userName}} logged a workout: {{workoutName}}",
        mergeFields: ["userName", "workoutName"],
      },
      {
        triggerEvent: "new_pr",
        channel: "push" as const,
        subject: undefined,
        body: "New PR! {{userName}} hit {{prValue}} on {{exerciseName}}",
        mergeFields: ["userName", "prValue", "exerciseName"],
      },
      {
        triggerEvent: "class_reminder",
        channel: "push" as const,
        subject: undefined,
        body: "Reminder: {{className}} starts in {{minutesUntil}} minutes",
        mergeFields: ["className", "minutesUntil"],
      },
    ];

    for (const tmpl of defaults) {
      await ctx.db.insert("notification_templates", {
        tenantId: args.tenantId,
        channel: tmpl.channel,
        triggerEvent: tmpl.triggerEvent,
        subject: tmpl.subject,
        body: tmpl.body,
        mergeFields: tmpl.mergeFields,
        enabled: true,
      });
    }
    return null;
  },
});
