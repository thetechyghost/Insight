import { v, ConvexError } from "convex/values";
import {
  authedMutation,
  tenantQuery,
  tenantMutation,
  enforceRole,
} from "./lib/customFunctions";
import { roleValidator, membershipStatusValidator } from "./lib/validators";
import { ROLE_HIERARCHY, type Role } from "./lib/tenancy";

// ============================================================================
// Membership return validator (reused across queries)
// ============================================================================

const membershipValidator = v.object({
  _id: v.id("memberships"),
  _creationTime: v.number(),
  userId: v.id("users"),
  tenantId: v.id("tenants"),
  role: roleValidator,
  status: membershipStatusValidator,
  isPrimaryGym: v.boolean(),
  membershipPlanId: v.optional(v.id("membership_plans")),
  subscriptionId: v.optional(v.id("subscriptions")),
  stripeCustomerId: v.optional(v.string()),
  paymentStatus: v.optional(
    v.union(v.literal("current"), v.literal("past_due"), v.literal("none"))
  ),
  startDate: v.optional(v.string()),
  endDate: v.optional(v.string()),
  joinDate: v.string(),
  referralSource: v.optional(v.string()),
  membershipType: v.optional(v.string()),
});

// ============================================================================
// getMyMembership — return the current user's membership for this tenant
// ============================================================================

export const getMyMembership = tenantQuery({
  args: {},
  returns: membershipValidator,
  handler: async (ctx) => {
    return ctx.membership;
  },
});

// ============================================================================
// listByTenant — list all memberships for the tenant (coach+)
// ============================================================================

export const listByTenant = tenantQuery({
  args: {
    status: v.optional(membershipStatusValidator),
  },
  returns: v.array(
    v.object({
      ...membershipValidator.fields,
      user: v.object({
        name: v.string(),
        email: v.string(),
        avatarStorageId: v.optional(v.id("_storage")),
      }),
    })
  ),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    let membershipsQuery;
    if (args.status) {
      membershipsQuery = ctx.db
        .query("memberships")
        .withIndex("by_tenantId_status", (q) =>
          q.eq("tenantId", ctx.tenantId).eq("status", args.status!)
        );
    } else {
      membershipsQuery = ctx.db
        .query("memberships")
        .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId));
    }

    const memberships = await membershipsQuery.collect();

    const results = await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);
        return {
          ...membership,
          user: {
            name: user?.name ?? "Unknown",
            email: user?.email ?? "",
            avatarStorageId: user?.avatarStorageId,
          },
        };
      })
    );

    return results;
  },
});

// ============================================================================
// getByUserId — get a specific user's membership in this tenant (coach+)
// ============================================================================

export const getByUserId = tenantQuery({
  args: { userId: v.id("users") },
  returns: v.union(membershipValidator, v.null()),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "coach");

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", args.userId).eq("tenantId", ctx.tenantId)
      )
      .unique();

    return membership ?? null;
  },
});

// ============================================================================
// join — join a tenant as a new member
// ============================================================================

export const join = authedMutation({
  args: {
    tenantId: v.id("tenants"),
    role: v.optional(roleValidator),
  },
  returns: v.id("memberships"),
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) {
      throw new ConvexError("Gym not found");
    }

    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", ctx.userId).eq("tenantId", args.tenantId)
      )
      .unique();

    if (existing) {
      throw new ConvexError("You are already a member of this gym");
    }

    const otherMemberships = await ctx.db
      .query("memberships")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.userId))
      .collect();

    const isPrimaryGym = otherMemberships.length === 0;

    return await ctx.db.insert("memberships", {
      userId: ctx.userId,
      tenantId: args.tenantId,
      role: args.role ?? "athlete",
      status: "active",
      isPrimaryGym,
      joinDate: new Date().toISOString().split("T")[0],
    });
  },
});

// ============================================================================
// updateRole — change a member's role (owner+)
// ============================================================================

export const updateRole = tenantMutation({
  args: {
    membershipId: v.id("memberships"),
    role: roleValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");

    const target = await ctx.db.get(args.membershipId);
    if (!target || target.tenantId !== ctx.tenantId) {
      throw new ConvexError("Membership not found in this gym");
    }

    if (args.membershipId === ctx.membership._id) {
      throw new ConvexError("You cannot change your own role");
    }

    const newRoleLevel = ROLE_HIERARCHY[args.role as Role];
    const myRoleLevel = ROLE_HIERARCHY[ctx.role];
    if (newRoleLevel > myRoleLevel) {
      throw new ConvexError("Cannot promote to a role higher than your own");
    }

    await ctx.db.patch(args.membershipId, { role: args.role });
    return null;
  },
});

// ============================================================================
// updateStatus — change a member's status (admin+)
// ============================================================================

export const updateStatus = tenantMutation({
  args: {
    membershipId: v.id("memberships"),
    status: membershipStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    const target = await ctx.db.get(args.membershipId);
    if (!target || target.tenantId !== ctx.tenantId) {
      throw new ConvexError("Membership not found in this gym");
    }

    if (target.role === "owner") {
      throw new ConvexError("Cannot change an owner's status");
    }

    await ctx.db.patch(args.membershipId, { status: args.status });
    return null;
  },
});

// ============================================================================
// setPrimaryGym — set which gym is the user's primary
// ============================================================================

export const setPrimaryGym = authedMutation({
  args: {
    tenantId: v.id("tenants"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.userId))
      .collect();

    let found = false;
    for (const membership of memberships) {
      if (membership.tenantId === args.tenantId) {
        found = true;
        await ctx.db.patch(membership._id, { isPrimaryGym: true });
      } else if (membership.isPrimaryGym) {
        await ctx.db.patch(membership._id, { isPrimaryGym: false });
      }
    }

    if (!found) {
      throw new ConvexError("You are not a member of this gym");
    }

    return null;
  },
});

// ============================================================================
// leave — leave the current tenant
// ============================================================================

export const leave = tenantMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    if (ctx.role === "owner") {
      throw new ConvexError(
        "Owners cannot leave. Transfer ownership first."
      );
    }

    await ctx.db.patch(ctx.membership._id, { status: "cancelled" });
    return null;
  },
});
