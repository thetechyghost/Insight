import { v, ConvexError } from "convex/values";
import {
  tenantQuery,
  tenantMutation,
  enforceRole,
} from "./lib/customFunctions";
import { staffStatusValidator } from "./lib/validators";

// ============================================================================
// Return validators
// ============================================================================

const staffValidator = v.object({
  _id: v.id("staff"),
  _creationTime: v.number(),
  membershipId: v.id("memberships"),
  tenantId: v.id("tenants"),
  jobTitle: v.optional(v.string()),
  hireDate: v.optional(v.string()),
  permissions: v.optional(v.array(v.string())),
  status: staffStatusValidator,
  assignedRoles: v.optional(v.array(v.string())),
});

// ============================================================================
// listByTenant — list all staff for the tenant (admin+)
// ============================================================================

export const listByTenant = tenantQuery({
  args: {},
  returns: v.array(staffValidator),
  handler: async (ctx) => {
    enforceRole(ctx.role, "admin");

    return await ctx.db
      .query("staff")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
  },
});

// ============================================================================
// getById — get a specific staff record (admin+)
// ============================================================================

export const getById = tenantQuery({
  args: { staffId: v.id("staff") },
  returns: staffValidator,
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw new ConvexError("Staff record not found");
    }

    if (staff.tenantId !== ctx.tenantId) {
      throw new ConvexError("Staff record does not belong to this tenant");
    }

    return staff;
  },
});

// ============================================================================
// create — create a new staff record (owner+)
// ============================================================================

export const create = tenantMutation({
  args: {
    membershipId: v.id("memberships"),
    jobTitle: v.optional(v.string()),
    permissions: v.optional(v.array(v.string())),
    assignedRoles: v.optional(v.array(v.string())),
  },
  returns: v.id("staff"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");

    // Verify the membership belongs to this tenant
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) {
      throw new ConvexError("Membership not found");
    }

    if (membership.tenantId !== ctx.tenantId) {
      throw new ConvexError("Membership does not belong to this tenant");
    }

    return await ctx.db.insert("staff", {
      membershipId: args.membershipId,
      tenantId: ctx.tenantId,
      jobTitle: args.jobTitle,
      hireDate: new Date().toISOString().split("T")[0],
      permissions: args.permissions,
      status: "active",
      assignedRoles: args.assignedRoles,
    });
  },
});

// ============================================================================
// update — update a staff record (owner+)
// ============================================================================

export const update = tenantMutation({
  args: {
    staffId: v.id("staff"),
    jobTitle: v.optional(v.string()),
    permissions: v.optional(v.array(v.string())),
    status: v.optional(staffStatusValidator),
    assignedRoles: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");

    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw new ConvexError("Staff record not found");
    }

    if (staff.tenantId !== ctx.tenantId) {
      throw new ConvexError("Staff record does not belong to this tenant");
    }

    const updates: Record<string, unknown> = {};
    if (args.jobTitle !== undefined) updates.jobTitle = args.jobTitle;
    if (args.permissions !== undefined) updates.permissions = args.permissions;
    if (args.status !== undefined) updates.status = args.status;
    if (args.assignedRoles !== undefined)
      updates.assignedRoles = args.assignedRoles;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.staffId, updates);
    }

    return null;
  },
});

// ============================================================================
// deactivate — deactivate a staff record (owner+)
// ============================================================================

export const deactivate = tenantMutation({
  args: { staffId: v.id("staff") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");

    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw new ConvexError("Staff record not found");
    }

    if (staff.tenantId !== ctx.tenantId) {
      throw new ConvexError("Staff record does not belong to this tenant");
    }

    await ctx.db.patch(args.staffId, { status: "inactive" });
    return null;
  },
});
