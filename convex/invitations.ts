import { v, ConvexError } from "convex/values";
import { query } from "./_generated/server";
import {
  tenantQuery,
  tenantMutation,
  authedMutation,
  enforceRole,
} from "./lib/customFunctions";
import { roleValidator, inviteStatusValidator } from "./lib/validators";
import { generateToken, isExpired } from "./lib/helpers";

// ============================================================================
// Return validators
// ============================================================================

const invitationValidator = v.object({
  _id: v.id("invitations"),
  _creationTime: v.number(),
  tenantId: v.id("tenants"),
  email: v.string(),
  role: roleValidator,
  token: v.string(),
  status: inviteStatusValidator,
  invitedBy: v.id("users"),
  expiresAt: v.number(),
});

// ============================================================================
// listByTenant — list invitations for the tenant, optionally filtered by status
// ============================================================================

export const listByTenant = tenantQuery({
  args: {
    status: v.optional(inviteStatusValidator),
  },
  returns: v.array(invitationValidator),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();

    if (args.status) {
      return invitations.filter((inv) => inv.status === args.status);
    }

    return invitations;
  },
});

// ============================================================================
// getByToken — public query to look up an invitation by token
// ============================================================================

export const getByToken = query({
  args: { token: v.string() },
  returns: v.union(invitationValidator, v.null()),
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    return invitation ?? null;
  },
});

// ============================================================================
// create — create a new invitation (admin+)
// ============================================================================

export const create = tenantMutation({
  args: {
    email: v.string(),
    role: roleValidator,
  },
  returns: v.id("invitations"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    // Check for existing pending invite for this email + tenant
    const existing = await ctx.db
      .query("invitations")
      .withIndex("by_email_tenantId", (q) =>
        q.eq("email", args.email).eq("tenantId", ctx.tenantId)
      )
      .collect();

    const pendingInvite = existing.find((inv) => inv.status === "pending");
    if (pendingInvite) {
      throw new ConvexError(
        "A pending invitation already exists for this email"
      );
    }

    const token = generateToken();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    return await ctx.db.insert("invitations", {
      tenantId: ctx.tenantId,
      email: args.email,
      role: args.role,
      token,
      status: "pending",
      invitedBy: ctx.userId,
      expiresAt,
    });
  },
});

// ============================================================================
// accept — accept an invitation by token (authed user)
// ============================================================================

export const accept = authedMutation({
  args: { token: v.string() },
  returns: v.id("memberships"),
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invitation) {
      throw new ConvexError("Invitation not found");
    }

    if (invitation.status === "accepted") {
      throw new ConvexError("This invitation has already been accepted");
    }

    if (invitation.status === "revoked") {
      throw new ConvexError("This invitation has been revoked");
    }

    if (isExpired(invitation.expiresAt)) {
      await ctx.db.patch(invitation._id, { status: "expired" });
      throw new ConvexError("This invitation has expired");
    }

    if (invitation.status !== "pending") {
      throw new ConvexError("This invitation is no longer valid");
    }

    // Create membership
    const membershipId = await ctx.db.insert("memberships", {
      userId: ctx.userId,
      tenantId: invitation.tenantId,
      role: invitation.role,
      status: "active",
      isPrimaryGym: false,
      joinDate: new Date().toISOString().split("T")[0],
    });

    // Mark invitation as accepted
    await ctx.db.patch(invitation._id, { status: "accepted" });

    return membershipId;
  },
});

// ============================================================================
// revoke — revoke a pending invitation (admin+)
// ============================================================================

export const revoke = tenantMutation({
  args: { invitationId: v.id("invitations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "admin");

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new ConvexError("Invitation not found");
    }

    if (invitation.tenantId !== ctx.tenantId) {
      throw new ConvexError("Invitation does not belong to this tenant");
    }

    if (invitation.status !== "pending") {
      throw new ConvexError("Only pending invitations can be revoked");
    }

    await ctx.db.patch(args.invitationId, { status: "revoked" });
    return null;
  },
});
