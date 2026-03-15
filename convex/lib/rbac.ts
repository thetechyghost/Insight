import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { ConvexError } from "convex/values";

/**
 * Standard permission strings used across the platform.
 */
export const PERMISSIONS = {
  MANAGE_MEMBERS: "manage_members",
  MANAGE_STAFF: "manage_staff",
  MANAGE_BILLING: "manage_billing",
  MANAGE_CLASSES: "manage_classes",
  MANAGE_PROGRAMMING: "manage_programming",
  VIEW_REPORTS: "view_reports",
  MANAGE_SETTINGS: "manage_settings",
  MANAGE_INVENTORY: "manage_inventory",
  MANAGE_WAIVERS: "manage_waivers",
  MANAGE_CONTENT: "manage_content",
  MANAGE_SOCIAL: "manage_social",
  MANAGE_COMMUNICATIONS: "manage_communications",
  MANAGE_SCHEDULING: "manage_scheduling",
  MANAGE_DEVICES: "manage_devices",
  VIEW_MEMBER_DETAILS: "view_member_details",
  MANAGE_CHALLENGES: "manage_challenges",
  MANAGE_LEADS: "manage_leads",
  MANAGE_PRODUCTS: "manage_products",
} as const;

/**
 * Default permissions for each built-in role.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  athlete: [],
  coach: [
    PERMISSIONS.VIEW_MEMBER_DETAILS,
    PERMISSIONS.MANAGE_PROGRAMMING,
    PERMISSIONS.MANAGE_CLASSES,
    PERMISSIONS.MANAGE_CONTENT,
    PERMISSIONS.MANAGE_CHALLENGES,
  ],
  admin: [
    PERMISSIONS.VIEW_MEMBER_DETAILS,
    PERMISSIONS.MANAGE_MEMBERS,
    PERMISSIONS.MANAGE_PROGRAMMING,
    PERMISSIONS.MANAGE_CLASSES,
    PERMISSIONS.MANAGE_CONTENT,
    PERMISSIONS.MANAGE_CHALLENGES,
    PERMISSIONS.MANAGE_SCHEDULING,
    PERMISSIONS.MANAGE_DEVICES,
    PERMISSIONS.MANAGE_WAIVERS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_COMMUNICATIONS,
  ],
  owner: [
    PERMISSIONS.MANAGE_MEMBERS,
    PERMISSIONS.MANAGE_STAFF,
    PERMISSIONS.MANAGE_BILLING,
    PERMISSIONS.MANAGE_CLASSES,
    PERMISSIONS.MANAGE_PROGRAMMING,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.MANAGE_WAIVERS,
    PERMISSIONS.MANAGE_CONTENT,
    PERMISSIONS.MANAGE_SOCIAL,
    PERMISSIONS.MANAGE_COMMUNICATIONS,
    PERMISSIONS.MANAGE_SCHEDULING,
    PERMISSIONS.MANAGE_DEVICES,
    PERMISSIONS.VIEW_MEMBER_DETAILS,
    PERMISSIONS.MANAGE_CHALLENGES,
    PERMISSIONS.MANAGE_LEADS,
    PERMISSIONS.MANAGE_PRODUCTS,
  ],
};

/**
 * Check if a user's role in the tenant has a specific permission.
 */
export async function checkPermission(
  ctx: QueryCtx | MutationCtx,
  tenantId: Id<"tenants">,
  roleName: string,
  permission: string
): Promise<boolean> {
  const roleRecord = await ctx.db
    .query("roles_permissions")
    .withIndex("by_tenantId_roleName", (q) =>
      q.eq("tenantId", tenantId).eq("roleName", roleName)
    )
    .unique();

  if (!roleRecord) {
    return false;
  }

  return roleRecord.permissions.includes(permission);
}

/**
 * Get all permissions for a role in a tenant.
 */
export async function getPermissionsForRole(
  ctx: QueryCtx | MutationCtx,
  tenantId: Id<"tenants">,
  roleName: string
): Promise<string[]> {
  const roleRecord = await ctx.db
    .query("roles_permissions")
    .withIndex("by_tenantId_roleName", (q) =>
      q.eq("tenantId", tenantId).eq("roleName", roleName)
    )
    .unique();

  return roleRecord?.permissions ?? [];
}
