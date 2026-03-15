import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// --- Return validator ---

const annotationTemplateValidator = v.object({
  _id: v.id("annotation_templates"),
  _creationTime: v.number(),
  name: v.string(),
  tenantId: v.id("tenants"),
  movementCategory: v.optional(v.string()),
  content: v.string(),
});

// ============================================================================
// list — list annotation templates for the tenant
// ============================================================================

export const list = tenantQuery({
  args: {},
  returns: v.array(annotationTemplateValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("annotation_templates")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
  },
});

// ============================================================================
// create — create an annotation template (coach+)
// ============================================================================

export const create = tenantMutation({
  args: {
    name: v.string(),
    movementCategory: v.optional(v.string()),
    content: v.string(),
  },
  returns: v.id("annotation_templates"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    return await ctx.db.insert("annotation_templates", {
      tenantId: ctx.tenantId,
      name: args.name,
      ...(args.movementCategory !== undefined
        ? { movementCategory: args.movementCategory }
        : {}),
      content: args.content,
    });
  },
});

// ============================================================================
// update — update an annotation template (coach+)
// ============================================================================

export const update = tenantMutation({
  args: {
    templateId: v.id("annotation_templates"),
    name: v.optional(v.string()),
    movementCategory: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const template = await ctx.db.get(args.templateId);
    if (!template || template.tenantId !== ctx.tenantId) {
      throw new ConvexError("Annotation template not found");
    }

    const { templateId: _id, ...updates } = args;
    await ctx.db.patch(args.templateId, updates);

    return null;
  },
});

// ============================================================================
// remove — delete an annotation template (coach+)
// ============================================================================

export const remove = tenantMutation({
  args: {
    templateId: v.id("annotation_templates"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const template = await ctx.db.get(args.templateId);
    if (!template || template.tenantId !== ctx.tenantId) {
      throw new ConvexError("Annotation template not found");
    }

    await ctx.db.delete(args.templateId);

    return null;
  },
});
