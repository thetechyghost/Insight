import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

const sourceValidator = v.union(
  v.literal("web_form"), v.literal("referral"), v.literal("walk_in"),
  v.literal("social"), v.literal("ad"), v.literal("other"),
);

const statusValidator = v.union(
  v.literal("new"), v.literal("contacted"), v.literal("trial"),
  v.literal("converted"), v.literal("lost"),
);

const leadValidator = v.object({
  _id: v.id("leads"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  name: v.string(),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  source: v.optional(sourceValidator),
  status: statusValidator,
  assignedStaffId: v.optional(v.id("users")),
  notes: v.optional(v.string()),
  score: v.optional(v.number()),
});

// list — list leads for this tenant (admin+), optional status filter
export const list = tenantQuery({
  args: { status: v.optional(statusValidator) },
  returns: v.array(leadValidator),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    if (args.status) {
      return await ctx.db.query("leads")
        .withIndex("by_tenantId_status", (q) =>
          q.eq("tenantId", ctx.tenantId).eq("status", args.status!))
        .collect();
    }
    return await ctx.db.query("leads")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
  },
});

// getById — get a single lead (admin+)
export const getById = tenantQuery({
  args: { leadId: v.id("leads") },
  returns: leadValidator,
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    const lead = await ctx.db.get(args.leadId);
    if (!lead || lead.tenantId !== ctx.tenantId) throw new ConvexError("Lead not found");
    return lead;
  },
});

// create — create a new lead (admin+)
export const create = tenantMutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    source: v.optional(sourceValidator),
    score: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.id("leads"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    return await ctx.db.insert("leads", {
      tenantId: ctx.tenantId, ...args, status: "new",
    });
  },
});

// update — update a lead (admin+)
export const update = tenantMutation({
  args: {
    leadId: v.id("leads"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    source: v.optional(sourceValidator),
    status: v.optional(statusValidator),
    score: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    const lead = await ctx.db.get(args.leadId);
    if (!lead || lead.tenantId !== ctx.tenantId) throw new ConvexError("Lead not found");
    const { leadId: _, ...updates } = args;
    await ctx.db.patch(args.leadId, updates);
    return null;
  },
});

// assign — assign a lead to a staff member (admin+)
export const assign = tenantMutation({
  args: { leadId: v.id("leads"), userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    const lead = await ctx.db.get(args.leadId);
    if (!lead || lead.tenantId !== ctx.tenantId) throw new ConvexError("Lead not found");
    await ctx.db.patch(args.leadId, { assignedStaffId: args.userId });
    return null;
  },
});

// convert — mark a lead as converted (admin+)
export const convert = tenantMutation({
  args: { leadId: v.id("leads") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    const lead = await ctx.db.get(args.leadId);
    if (!lead || lead.tenantId !== ctx.tenantId) throw new ConvexError("Lead not found");
    await ctx.db.patch(args.leadId, { status: "converted" });
    return null;
  },
});

// remove — delete a lead (admin+)
export const remove = tenantMutation({
  args: { leadId: v.id("leads") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    const lead = await ctx.db.get(args.leadId);
    if (!lead || lead.tenantId !== ctx.tenantId) throw new ConvexError("Lead not found");
    await ctx.db.delete(args.leadId);
    return null;
  },
});
