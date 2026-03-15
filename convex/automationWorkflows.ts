import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";
import { internalMutation } from "./_generated/server";

// ============================================================================
// Return validators
// ============================================================================

const workflowValidator = v.object({
  _id: v.id("automation_workflows"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  triggerEvent: v.string(),
  conditions: v.optional(v.any()),
  action: v.string(),
  delay: v.optional(v.number()),
  audienceFilter: v.optional(v.any()),
  isActive: v.boolean(),
});

// ============================================================================
// list — list all automation workflows for the tenant
// ============================================================================

export const list = tenantQuery({
  args: {},
  returns: v.array(workflowValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("automation_workflows")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
  },
});

// ============================================================================
// getById — get a single workflow by ID
// ============================================================================

export const getById = tenantQuery({
  args: { workflowId: v.id("automation_workflows") },
  returns: workflowValidator,
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.tenantId !== ctx.tenantId) {
      throw new ConvexError("Automation workflow not found");
    }
    return workflow;
  },
});

// ============================================================================
// create — create a new automation workflow (owner+)
// ============================================================================

export const create = tenantMutation({
  args: {
    triggerEvent: v.string(),
    conditions: v.optional(v.any()),
    action: v.string(),
    delay: v.optional(v.number()),
    audienceFilter: v.optional(v.any()),
    isActive: v.boolean(),
  },
  returns: v.id("automation_workflows"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");

    return await ctx.db.insert("automation_workflows", {
      tenantId: ctx.tenantId,
      triggerEvent: args.triggerEvent,
      conditions: args.conditions,
      action: args.action,
      delay: args.delay,
      audienceFilter: args.audienceFilter,
      isActive: args.isActive,
    });
  },
});

// ============================================================================
// update — update an automation workflow (owner+)
// ============================================================================

export const update = tenantMutation({
  args: {
    workflowId: v.id("automation_workflows"),
    triggerEvent: v.optional(v.string()),
    conditions: v.optional(v.any()),
    action: v.optional(v.string()),
    delay: v.optional(v.number()),
    audienceFilter: v.optional(v.any()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.tenantId !== ctx.tenantId) {
      throw new ConvexError("Automation workflow not found");
    }

    const updates: Record<string, unknown> = {};
    if (args.triggerEvent !== undefined) updates.triggerEvent = args.triggerEvent;
    if (args.conditions !== undefined) updates.conditions = args.conditions;
    if (args.action !== undefined) updates.action = args.action;
    if (args.delay !== undefined) updates.delay = args.delay;
    if (args.audienceFilter !== undefined) updates.audienceFilter = args.audienceFilter;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.workflowId, updates);
    }
    return null;
  },
});

// ============================================================================
// toggle — toggle a workflow's active state (owner+)
// ============================================================================

export const toggle = tenantMutation({
  args: {
    workflowId: v.id("automation_workflows"),
    isActive: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.tenantId !== ctx.tenantId) {
      throw new ConvexError("Automation workflow not found");
    }

    await ctx.db.patch(args.workflowId, { isActive: args.isActive });
    return null;
  },
});

// ============================================================================
// evaluate — internal: find and evaluate active workflows for a trigger event
// ============================================================================

export const evaluate = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    triggerEvent: v.string(),
    data: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const workflows = await ctx.db
      .query("automation_workflows")
      .withIndex("by_tenantId_triggerEvent", (q) =>
        q.eq("tenantId", args.tenantId).eq("triggerEvent", args.triggerEvent)
      )
      .collect();

    const active = workflows.filter((w) => w.isActive);

    for (const workflow of active) {
      // Placeholder: evaluate conditions against data and execute action
      console.log(
        `[evaluate] Would execute workflow "${workflow.action}" for trigger "${args.triggerEvent}" with data:`,
        args.data
      );
    }
    return null;
  },
});
