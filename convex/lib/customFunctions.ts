import {
  customQuery,
  customMutation,
  customAction,
} from "convex-helpers/server/customFunctions";
import { query, mutation, action } from "../_generated/server";
import { v } from "convex/values";
import { getUserFromAuth, getIdentityFromAuth } from "./auth";
import { verifyMembership, requireRole, type Role } from "./tenancy";

// ============================================================================
// authedQuery — requires authentication, injects ctx.user + ctx.userId
// ============================================================================

export const authedQuery = customQuery(query, {
  args: {},
  input: async (ctx, _args) => {
    const { userId, user } = await getUserFromAuth(ctx);
    return { ctx: { user, userId }, args: {} };
  },
});

// ============================================================================
// authedMutation — requires authentication, injects ctx.user + ctx.userId
// ============================================================================

export const authedMutation = customMutation(mutation, {
  args: {},
  input: async (ctx, _args) => {
    const { userId, user } = await getUserFromAuth(ctx);
    return { ctx: { user, userId }, args: {} };
  },
});

// ============================================================================
// tenantQuery — requires auth + active membership, injects full tenant context
// ============================================================================

export const tenantQuery = customQuery(query, {
  args: { tenantId: v.id("tenants") },
  input: async (ctx, args) => {
    const { userId, user } = await getUserFromAuth(ctx);
    const { membership, role } = await verifyMembership(
      ctx,
      userId,
      args.tenantId
    );
    return {
      ctx: { user, userId, tenantId: args.tenantId, membership, role },
      args: {},
    };
  },
});

// ============================================================================
// tenantMutation — requires auth + active membership + optional minimum role
// ============================================================================

export const tenantMutation = customMutation(mutation, {
  args: { tenantId: v.id("tenants") },
  input: async (ctx, args) => {
    const { userId, user } = await getUserFromAuth(ctx);
    const { membership, role } = await verifyMembership(
      ctx,
      userId,
      args.tenantId
    );
    return {
      ctx: { user, userId, tenantId: args.tenantId, membership, role },
      args: {},
    };
  },
});

// ============================================================================
// tenantAction — requires auth + identity, for external API calls
// ============================================================================

export const tenantAction = customAction(action, {
  args: { tenantId: v.id("tenants") },
  input: async (ctx, args) => {
    const identity = await getIdentityFromAuth(ctx);
    return {
      ctx: { identity, tenantId: args.tenantId },
      args: {},
    };
  },
});

// ============================================================================
// Helper: enforce minimum role within a handler
// ============================================================================

/**
 * Call this at the top of a tenantMutation/tenantQuery handler
 * to enforce a minimum role.
 *
 * Usage:
 *   handler: async (ctx, args) => {
 *     enforceRole(ctx.role, "coach");
 *     // ... rest of handler
 *   }
 */
export function enforceRole(userRole: Role, minimumRole: Role): void {
  requireRole(userRole, minimumRole);
}
