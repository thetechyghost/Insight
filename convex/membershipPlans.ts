import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";

// --- Return validator ---

const planValidator = v.object({
  _id: v.id("membership_plans"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  name: v.string(),
  description: v.optional(v.string()),
  type: v.union(
    v.literal("recurring"), v.literal("punch_card"),
    v.literal("drop_in"), v.literal("trial"),
  ),
  price: v.number(),
  currency: v.optional(v.string()),
  billingInterval: v.optional(v.union(
    v.literal("weekly"), v.literal("monthly"), v.literal("quarterly"), v.literal("annual"),
  )),
  classesPerWeek: v.optional(v.number()),
  contractLengthMonths: v.optional(v.number()),
  setupFee: v.optional(v.number()),
  trialDays: v.optional(v.number()),
  features: v.optional(v.array(v.string())),
  includedClassesPerPeriod: v.optional(v.number()),
  freezePolicy: v.optional(v.string()),
  cancellationTerms: v.optional(v.string()),
  isActive: v.optional(v.boolean()),
});

// ============================================================================
// list — list membership plans for the tenant (optionally active only)
// ============================================================================

export const list = tenantQuery({
  args: { activeOnly: v.optional(v.boolean()) },
  returns: v.array(planValidator),
  handler: async (ctx, args) => {
    if (args.activeOnly) {
      return await ctx.db
        .query("membership_plans")
        .withIndex("by_tenantId_isActive", (q) =>
          q.eq("tenantId", ctx.tenantId).eq("isActive", true)
        )
        .collect();
    }
    return await ctx.db
      .query("membership_plans")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
  },
});

// ============================================================================
// getById — get a single membership plan
// ============================================================================

export const getById = tenantQuery({
  args: { planId: v.id("membership_plans") },
  returns: planValidator,
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.tenantId !== ctx.tenantId) {
      throw new ConvexError("Membership plan not found");
    }
    return plan;
  },
});

// ============================================================================
// create — create a new membership plan (owner+)
// ============================================================================

export const create = tenantMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal("recurring"), v.literal("punch_card"),
      v.literal("drop_in"), v.literal("trial"),
    ),
    price: v.number(),
    currency: v.optional(v.string()),
    billingInterval: v.optional(v.union(
      v.literal("weekly"), v.literal("monthly"), v.literal("quarterly"), v.literal("annual"),
    )),
    classesPerWeek: v.optional(v.number()),
    contractLengthMonths: v.optional(v.number()),
    setupFee: v.optional(v.number()),
    trialDays: v.optional(v.number()),
    features: v.optional(v.array(v.string())),
    includedClassesPerPeriod: v.optional(v.number()),
    freezePolicy: v.optional(v.string()),
    cancellationTerms: v.optional(v.string()),
  },
  returns: v.id("membership_plans"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");

    return await ctx.db.insert("membership_plans", {
      tenantId: ctx.tenantId,
      ...args,
      isActive: true,
    });
  },
});

// ============================================================================
// update — update a membership plan (owner+)
// ============================================================================

export const update = tenantMutation({
  args: {
    planId: v.id("membership_plans"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    billingInterval: v.optional(v.union(
      v.literal("weekly"), v.literal("monthly"), v.literal("quarterly"), v.literal("annual"),
    )),
    classesPerWeek: v.optional(v.number()),
    setupFee: v.optional(v.number()),
    trialDays: v.optional(v.number()),
    features: v.optional(v.array(v.string())),
    includedClassesPerPeriod: v.optional(v.number()),
    freezePolicy: v.optional(v.string()),
    cancellationTerms: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");

    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.tenantId !== ctx.tenantId) {
      throw new ConvexError("Membership plan not found");
    }

    const { planId: _id, ...updates } = args;
    await ctx.db.patch(args.planId, updates);
    return null;
  },
});

// ============================================================================
// deactivate — deactivate a membership plan (owner+)
// ============================================================================

export const deactivate = tenantMutation({
  args: { planId: v.id("membership_plans") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");

    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.tenantId !== ctx.tenantId) {
      throw new ConvexError("Membership plan not found");
    }

    await ctx.db.patch(args.planId, { isActive: false });
    return null;
  },
});
