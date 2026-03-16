import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { DEFAULT_ROLE_PERMISSIONS } from "./lib/rbac";

/**
 * Internal mutations for integration test seeding and cleanup.
 * These are NOT publicly callable — they are invoked via HTTP actions
 * gated by a test API key (see http.ts /test/* routes).
 *
 * IMPORTANT: These endpoints should only be enabled on dev/staging deployments.
 * Set the ENABLE_TEST_ENDPOINTS environment variable on the Convex deployment.
 */

// ============================================================================
// seedUser — create a user record for testing
// ============================================================================

export const seedUser = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    // Idempotent: return existing user if email already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
    });
  },
});

// ============================================================================
// seedTenant — create a tenant record for testing
// ============================================================================

export const seedTenant = internalMutation({
  args: {
    name: v.string(),
    slug: v.string(),
  },
  returns: v.id("tenants"),
  handler: async (ctx, args) => {
    // Idempotent: return existing tenant if slug already exists
    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("tenants", {
      name: args.name,
      slug: args.slug,
    });
  },
});

// ============================================================================
// seedMembership — create a membership linking user to tenant
// ============================================================================

export const seedMembership = internalMutation({
  args: {
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    role: v.union(
      v.literal("athlete"),
      v.literal("coach"),
      v.literal("owner"),
      v.literal("admin")
    ),
    isPrimaryGym: v.boolean(),
  },
  returns: v.id("memberships"),
  handler: async (ctx, args) => {
    // Idempotent: return existing membership if user+tenant combo exists
    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_userId_tenantId", (q) =>
        q.eq("userId", args.userId).eq("tenantId", args.tenantId)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("memberships", {
      userId: args.userId,
      tenantId: args.tenantId,
      role: args.role,
      status: "active",
      isPrimaryGym: args.isPrimaryGym,
      joinDate: new Date().toISOString().split("T")[0],
    });
  },
});

// ============================================================================
// seedRolesPermissions — create default role permission records for a tenant
// ============================================================================

export const seedRolesPermissions = internalMutation({
  args: {
    tenantId: v.id("tenants"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if roles already exist for this tenant
    const existing = await ctx.db
      .query("roles_permissions")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();

    if (existing) {
      return null; // Already seeded
    }

    for (const [roleName, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      await ctx.db.insert("roles_permissions", {
        tenantId: args.tenantId,
        roleName,
        permissions,
      });
    }

    return null;
  },
});

// ============================================================================
// cleanupByPrefix — delete all test records matching a prefix pattern
// ============================================================================

export const cleanupByPrefix = internalMutation({
  args: {
    prefix: v.string(),
  },
  returns: v.object({
    deletedUsers: v.number(),
    deletedTenants: v.number(),
    deletedMemberships: v.number(),
    deletedRoles: v.number(),
  }),
  handler: async (ctx, args) => {
    let deletedUsers = 0;
    let deletedTenants = 0;
    let deletedMemberships = 0;
    let deletedRoles = 0;

    // Find tenants by slug prefix
    const tenants = await ctx.db.query("tenants").collect();
    const matchingTenants = tenants.filter((t) => t.slug.startsWith(args.prefix));

    for (const tenant of matchingTenants) {
      // Delete memberships for this tenant
      const memberships = await ctx.db
        .query("memberships")
        .withIndex("by_tenantId", (q) => q.eq("tenantId", tenant._id))
        .collect();

      for (const m of memberships) {
        await ctx.db.delete(m._id);
        deletedMemberships++;
      }

      // Delete roles_permissions for this tenant
      const roles = await ctx.db
        .query("roles_permissions")
        .withIndex("by_tenantId", (q) => q.eq("tenantId", tenant._id))
        .collect();

      for (const r of roles) {
        await ctx.db.delete(r._id);
        deletedRoles++;
      }

      // Delete tenant
      await ctx.db.delete(tenant._id);
      deletedTenants++;
    }

    // Find and delete users by email prefix
    const users = await ctx.db.query("users").collect();
    const matchingUsers = users.filter((u) =>
      u.email.includes(args.prefix)
    );

    for (const user of matchingUsers) {
      await ctx.db.delete(user._id);
      deletedUsers++;
    }

    return { deletedUsers, deletedTenants, deletedMemberships, deletedRoles };
  },
});
