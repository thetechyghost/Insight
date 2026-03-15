import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";
import { internalMutation } from "./_generated/server";

// --- Return validator ---

const scheduleTemplateValidator = v.object({
  _id: v.id("schedule_templates"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  name: v.string(),
  classId: v.id("classes"),
  dayOfWeek: v.number(),
  startTime: v.string(),
  endTime: v.string(),
  coachId: v.optional(v.id("users")),
  isActive: v.boolean(),
});

// ============================================================================
// list — list all schedule templates for the tenant
// ============================================================================

export const list = tenantQuery({
  args: {},
  returns: v.array(scheduleTemplateValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("schedule_templates")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
  },
});

// ============================================================================
// getById — get a single schedule template by ID
// ============================================================================

export const getById = tenantQuery({
  args: { templateId: v.id("schedule_templates") },
  returns: scheduleTemplateValidator,
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template || template.tenantId !== ctx.tenantId) {
      throw new ConvexError("Schedule template not found");
    }
    return template;
  },
});

// ============================================================================
// create — create a schedule template (admin+)
// ============================================================================

export const create = tenantMutation({
  args: {
    name: v.string(),
    classId: v.id("classes"),
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    coachId: v.optional(v.id("users")),
  },
  returns: v.id("schedule_templates"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    return await ctx.db.insert("schedule_templates", {
      tenantId: ctx.tenantId,
      ...args,
      isActive: true,
    });
  },
});

// ============================================================================
// update — update a schedule template (admin+)
// ============================================================================

export const update = tenantMutation({
  args: {
    templateId: v.id("schedule_templates"),
    name: v.optional(v.string()),
    classId: v.optional(v.id("classes")),
    dayOfWeek: v.optional(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    coachId: v.optional(v.id("users")),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    const template = await ctx.db.get(args.templateId);
    if (!template || template.tenantId !== ctx.tenantId) {
      throw new ConvexError("Schedule template not found");
    }

    const { templateId: _id, ...updates } = args;
    await ctx.db.patch(args.templateId, updates);

    return null;
  },
});

// ============================================================================
// remove — soft-delete a schedule template (admin+)
// ============================================================================

export const remove = tenantMutation({
  args: { templateId: v.id("schedule_templates") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    const template = await ctx.db.get(args.templateId);
    if (!template || template.tenantId !== ctx.tenantId) {
      throw new ConvexError("Schedule template not found");
    }

    await ctx.db.patch(args.templateId, { isActive: false });

    return null;
  },
});

// ============================================================================
// generateSessions — create class_sessions from active templates (internal)
// ============================================================================

export const generateSessions = internalMutation({
  args: { tenantId: v.id("tenants") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const templates = await ctx.db
      .query("schedule_templates")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const activeTemplates = templates.filter((t) => t.isActive);

    // Placeholder: generate sessions for the next 7 days
    const today = new Date();
    for (const template of activeTemplates) {
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        if (date.getDay() === template.dayOfWeek) {
          const dateStr = date.toISOString().split("T")[0];
          await ctx.db.insert("class_sessions", {
            tenantId: args.tenantId,
            classId: template.classId,
            date: dateStr,
            startTime: template.startTime,
            coachId: template.coachId,
            status: "scheduled",
          });
        }
      }
    }

    return null;
  },
});
