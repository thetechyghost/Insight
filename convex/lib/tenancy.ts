import { QueryCtx, MutationCtx } from "../_generated/server";
import { ConvexError } from "convex/values";
import { Doc, Id } from "../_generated/dataModel";

export type Role = "athlete" | "coach" | "admin" | "owner" | "super_admin";

export const ROLE_HIERARCHY: Record<Role, number> = {
  athlete: 0,
  coach: 1,
  admin: 2,
  owner: 3,
  super_admin: 4,
};

export type MembershipCtx = {
  membership: Doc<"memberships">;
  role: Role;
};

/**
 * Verifies the user has an active membership in the specified tenant.
 * Throws ConvexError if no active membership exists.
 */
export async function verifyMembership(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  tenantId: Id<"tenants">
): Promise<MembershipCtx> {
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_userId_tenantId", (q) =>
      q.eq("userId", userId).eq("tenantId", tenantId)
    )
    .unique();

  if (!membership) {
    throw new ConvexError("You are not a member of this gym");
  }

  if (membership.status !== "active") {
    throw new ConvexError(
      `Your membership is ${membership.status}. Please contact the gym owner.`
    );
  }

  return {
    membership,
    role: membership.role as Role,
  };
}

/**
 * Checks if userRole meets or exceeds the minimumRole in the hierarchy.
 */
export function hasMinimumRole(userRole: Role, minimumRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}

/**
 * Throws ConvexError if userRole doesn't meet the minimumRole.
 */
export function requireRole(userRole: Role, minimumRole: Role): void {
  if (!hasMinimumRole(userRole, minimumRole)) {
    throw new ConvexError(
      `Insufficient role. Required: ${minimumRole}, your role: ${userRole}`
    );
  }
}
