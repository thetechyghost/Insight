import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// --- Local validators ---

const exceptionTypeValidator = v.union(
  v.literal("cancelled"),
  v.literal("modified"),
  v.literal("holiday")
);

// --- Return validator ---

const scheduleExceptionValidator = v.object({
  _id: v.id("schedule_exceptions"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  templateId: v.id("schedule_templates"),
  date: v.string(),
  type: exceptionTypeValidator,
  modifiedStartTime: v.optional(v.string()),
  modifiedEndTime: v.optional(v.string()),
  reason: v.optional(v.string()),
});

// ============================================================================
// listByTemplate — list exceptions for a specific template
// ============================================================================

export const listByTemplate = tenantQuery({
  args: { templateId: v.id("schedule_templates") },
  returns: v.array(scheduleExceptionValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("schedule_exceptions")
      .withIndex("by_templateId", (q) => q.eq("templateId", args.templateId))
      .collect();
  },
});

// ============================================================================
// create — create a schedule exception (admin+)
// ============================================================================

export const create = tenantMutation({
  args: {
    templateId: v.id("schedule_templates"),
    date: v.string(),
    type: exceptionTypeValidator,
    modifiedStartTime: v.optional(v.string()),
    modifiedEndTime: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  returns: v.id("schedule_exceptions"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    const template = await ctx.db.get(args.templateId);
    if (!template || template.tenantId !== ctx.tenantId) {
      throw new ConvexError("Schedule template not found");
    }

    return await ctx.db.insert("schedule_exceptions", {
      tenantId: ctx.tenantId,
      ...args,
    });
  },
});

// ============================================================================
// update — update a schedule exception (admin+)
// ============================================================================

export const update = tenantMutation({
  args: {
    exceptionId: v.id("schedule_exceptions"),
    type: v.optional(exceptionTypeValidator),
    modifiedStartTime: v.optional(v.string()),
    modifiedEndTime: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    const exception = await ctx.db.get(args.exceptionId);
    if (!exception || exception.tenantId !== ctx.tenantId) {
      throw new ConvexError("Schedule exception not found");
    }

    const { exceptionId: _id, ...updates } = args;
    await ctx.db.patch(args.exceptionId, updates);

    return null;
  },
});

// ============================================================================
// remove — delete a schedule exception (admin+)
// ============================================================================

export const remove = tenantMutation({
  args: { exceptionId: v.id("schedule_exceptions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    const exception = await ctx.db.get(args.exceptionId);
    if (!exception || exception.tenantId !== ctx.tenantId) {
      throw new ConvexError("Schedule exception not found");
    }

    await ctx.db.delete(args.exceptionId);

    return null;
  },
});

// ============================================================================
// bulkCancel — cancel all active templates for a given date (admin+)
// ============================================================================

export const bulkCancel = tenantMutation({
  args: {
    date: v.string(),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    const templates = await ctx.db
      .query("schedule_templates")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();

    const activeTemplates = templates.filter((t) => t.isActive);

    for (const template of activeTemplates) {
      await ctx.db.insert("schedule_exceptions", {
        tenantId: ctx.tenantId,
        templateId: template._id,
        date: args.date,
        type: "cancelled",
        reason: args.reason,
      });
    }

    return null;
  },
});
