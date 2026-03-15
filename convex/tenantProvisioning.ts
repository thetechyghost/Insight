import { v, ConvexError } from "convex/values";
import { authedQuery, authedMutation } from "./lib/customFunctions";

const statusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("active"),
  v.literal("suspended")
);

const provisioningDoc = v.object({
  _id: v.id("tenant_provisioning"),
  _creationTime: v.number(),
  requestedBy: v.id("users"),
  tenantId: v.optional(v.id("tenants")),
  status: statusValidator,
  checklistState: v.optional(v.any()),
  stripeConnectOnboardingStatus: v.optional(v.string()),
});

// ============================================================================
// list — list provisioning records, optionally filtered by status
// ============================================================================

export const list = authedQuery({
  args: { status: v.optional(statusValidator) },
  returns: v.array(provisioningDoc),
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("tenant_provisioning")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    }
    return await ctx.db.query("tenant_provisioning").collect();
  },
});

// ============================================================================
// approve — approve a provisioning request
// ============================================================================

export const approve = authedMutation({
  args: { provisioningId: v.id("tenant_provisioning") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.provisioningId);
    if (!record) throw new ConvexError("Provisioning record not found");
    if (record.status !== "pending") {
      throw new ConvexError("Only pending requests can be approved");
    }
    await ctx.db.patch(args.provisioningId, { status: "approved" });
    return null;
  },
});

// ============================================================================
// suspend — suspend a provisioned tenant
// ============================================================================

export const suspend = authedMutation({
  args: { provisioningId: v.id("tenant_provisioning") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.provisioningId);
    if (!record) throw new ConvexError("Provisioning record not found");
    await ctx.db.patch(args.provisioningId, { status: "suspended" });
    return null;
  },
});

// ============================================================================
// activate — activate a provisioned tenant
// ============================================================================

export const activate = authedMutation({
  args: { provisioningId: v.id("tenant_provisioning") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.provisioningId);
    if (!record) throw new ConvexError("Provisioning record not found");
    if (record.status !== "approved") {
      throw new ConvexError("Only approved requests can be activated");
    }
    await ctx.db.patch(args.provisioningId, { status: "active" });
    return null;
  },
});
