import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";
import { internalQuery } from "./_generated/server";

const ruleDoc = v.object({
  _id: v.id("facility_access_rules"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  membershipPlanId: v.id("membership_plans"),
  areaId: v.id("facility_areas"),
  allowedHours: v.optional(v.any()),
  blackoutDates: v.optional(v.array(v.string())),
});

// ============================================================================
// list — list access rules for the tenant
// ============================================================================

export const list = tenantQuery({
  args: {},
  returns: v.array(ruleDoc),
  handler: async (ctx) => {
    return await ctx.db
      .query("facility_access_rules")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
  },
});

// ============================================================================
// create — create a new access rule (admin+)
// ============================================================================

export const create = tenantMutation({
  args: {
    membershipPlanId: v.id("membership_plans"),
    areaId: v.id("facility_areas"),
    allowedHours: v.optional(v.any()),
    blackoutDates: v.optional(v.array(v.string())),
  },
  returns: v.id("facility_access_rules"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    return await ctx.db.insert("facility_access_rules", {
      tenantId: ctx.tenantId,
      ...args,
    });
  },
});

// ============================================================================
// update — update an access rule (admin+)
// ============================================================================

export const update = tenantMutation({
  args: {
    ruleId: v.id("facility_access_rules"),
    allowedHours: v.optional(v.any()),
    blackoutDates: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    const rule = await ctx.db.get(args.ruleId);
    if (!rule) throw new ConvexError("Access rule not found");
    if (rule.tenantId !== ctx.tenantId) {
      throw new ConvexError("Rule does not belong to this tenant");
    }
    const { ruleId, ...updates } = args;
    await ctx.db.patch(ruleId, updates);
    return null;
  },
});

// ============================================================================
// remove — delete an access rule (admin+)
// ============================================================================

export const remove = tenantMutation({
  args: { ruleId: v.id("facility_access_rules") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    const rule = await ctx.db.get(args.ruleId);
    if (!rule) throw new ConvexError("Access rule not found");
    if (rule.tenantId !== ctx.tenantId) {
      throw new ConvexError("Rule does not belong to this tenant");
    }
    await ctx.db.delete(args.ruleId);
    return null;
  },
});

// ============================================================================
// checkAccess — internal: evaluate if a membership plan has area access
// ============================================================================

export const checkAccess = internalQuery({
  args: {
    tenantId: v.id("tenants"),
    areaId: v.id("facility_areas"),
    membershipPlanId: v.optional(v.id("membership_plans")),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const rules = await ctx.db
      .query("facility_access_rules")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const areaRules = rules.filter((r) => r.areaId === args.areaId);
    if (areaRules.length === 0) return true; // no rules = open access

    if (!args.membershipPlanId) return false;
    return areaRules.some(
      (r) => r.membershipPlanId === args.membershipPlanId
    );
  },
});
