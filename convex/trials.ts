import { v, ConvexError } from "convex/values";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";
import { internalMutation } from "./_generated/server";

// ============================================================================
// Local validators
// ============================================================================

const trialStatusValidator = v.union(
  v.literal("active"), v.literal("converted"), v.literal("expired"),
);

const trialValidator = v.object({
  _id: v.id("trials"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  leadId: v.optional(v.id("leads")),
  userId: v.optional(v.id("users")),
  startDate: v.string(),
  endDate: v.string(),
  planId: v.optional(v.id("membership_plans")),
  status: trialStatusValidator,
});

// ============================================================================
// list — list trials for this tenant (admin+)
// ============================================================================

export const list = tenantQuery({
  args: {},
  returns: v.array(trialValidator),
  handler: async (ctx) => {
    enforceRole(ctx.role, "admin");
    return await ctx.db
      .query("trials")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
  },
});

// ============================================================================
// create — create a new trial (admin+)
// ============================================================================

export const create = tenantMutation({
  args: {
    leadId: v.optional(v.id("leads")),
    userId: v.optional(v.id("users")),
    startDate: v.string(),
    endDate: v.string(),
    planId: v.optional(v.id("membership_plans")),
  },
  returns: v.id("trials"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    return await ctx.db.insert("trials", {
      tenantId: ctx.tenantId,
      ...args,
      status: "active",
    });
  },
});

// ============================================================================
// convert — mark a trial as converted (admin+)
// ============================================================================

export const convert = tenantMutation({
  args: { trialId: v.id("trials") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");
    const trial = await ctx.db.get(args.trialId);
    if (!trial || trial.tenantId !== ctx.tenantId) {
      throw new ConvexError("Trial not found");
    }
    await ctx.db.patch(args.trialId, { status: "converted" });
    return null;
  },
});

// ============================================================================
// expire — mark a trial as expired (internal)
// ============================================================================

export const expire = internalMutation({
  args: { trialId: v.id("trials") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const trial = await ctx.db.get(args.trialId);
    if (!trial) {
      throw new ConvexError("Trial not found");
    }
    await ctx.db.patch(args.trialId, { status: "expired" });
    return null;
  },
});
