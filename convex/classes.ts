import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// --- Return validator ---

const classValidator = v.object({
  _id: v.id("classes"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  name: v.string(),
  schedule: v.optional(v.any()),
  capacity: v.number(),
  coachId: v.optional(v.id("users")),
  track: v.optional(v.string()),
  location: v.optional(v.string()),
  scheduleTemplateId: v.optional(v.id("schedule_templates")),
  bookingPolicyId: v.optional(v.id("booking_policies")),
});

// ============================================================================
// list — list all classes for the tenant
// ============================================================================

export const list = tenantQuery({
  args: {},
  returns: v.array(classValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("classes")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
  },
});

// ============================================================================
// getById — get a single class by ID
// ============================================================================

export const getById = tenantQuery({
  args: {
    classId: v.id("classes"),
  },
  returns: classValidator,
  handler: async (ctx, args) => {
    const cls = await ctx.db.get(args.classId);
    if (!cls || cls.tenantId !== ctx.tenantId) {
      throw new ConvexError("Class not found");
    }
    return cls;
  },
});

// ============================================================================
// create — create a new class (coach+)
// ============================================================================

export const create = tenantMutation({
  args: {
    name: v.string(),
    schedule: v.optional(v.any()),
    capacity: v.number(),
    coachId: v.optional(v.id("users")),
    track: v.optional(v.string()),
    location: v.optional(v.string()),
    scheduleTemplateId: v.optional(v.id("schedule_templates")),
    bookingPolicyId: v.optional(v.id("booking_policies")),
  },
  returns: v.id("classes"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    return await ctx.db.insert("classes", {
      tenantId: ctx.tenantId,
      ...args,
    });
  },
});

// ============================================================================
// update — update a class (coach+)
// ============================================================================

export const update = tenantMutation({
  args: {
    classId: v.id("classes"),
    name: v.optional(v.string()),
    schedule: v.optional(v.any()),
    capacity: v.optional(v.number()),
    coachId: v.optional(v.id("users")),
    track: v.optional(v.string()),
    location: v.optional(v.string()),
    scheduleTemplateId: v.optional(v.id("schedule_templates")),
    bookingPolicyId: v.optional(v.id("booking_policies")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const cls = await ctx.db.get(args.classId);
    if (!cls || cls.tenantId !== ctx.tenantId) {
      throw new ConvexError("Class not found");
    }

    const { classId: _id, ...updates } = args;
    await ctx.db.patch(args.classId, updates);

    return null;
  },
});

// ============================================================================
// remove — soft-delete a class by removing it (coach+)
// ============================================================================

export const remove = tenantMutation({
  args: {
    classId: v.id("classes"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const cls = await ctx.db.get(args.classId);
    if (!cls || cls.tenantId !== ctx.tenantId) {
      throw new ConvexError("Class not found");
    }

    await ctx.db.delete(args.classId);

    return null;
  },
});
