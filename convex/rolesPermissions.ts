import { v, ConvexError } from "convex/values";
import { internalMutation } from "./_generated/server";
import { tenantQuery, tenantMutation, enforceRole } from "./lib/customFunctions";
import { DEFAULT_ROLE_PERMISSIONS } from "./lib/rbac";

const BUILT_IN_ROLES = ["athlete", "coach", "admin", "owner"];

export const getForTenant = tenantQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("roles_permissions"),
      _creationTime: v.number(),
      tenantId: v.id("tenants"),
      roleName: v.string(),
      permissions: v.array(v.string()),
      tier: v.optional(
        v.union(
          v.literal("athlete"),
          v.literal("coach"),
          v.literal("owner"),
          v.literal("admin"),
          v.literal("super_admin")
        )
      ),
    })
  ),
  handler: async (ctx) => {
    enforceRole(ctx.role, "owner");
    return await ctx.db
      .query("roles_permissions")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", ctx.tenantId))
      .collect();
  },
});

export const getMyPermissions = tenantQuery({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const roleRecord = await ctx.db
      .query("roles_permissions")
      .withIndex("by_tenantId_roleName", (q) =>
        q.eq("tenantId", ctx.tenantId).eq("roleName", ctx.role)
      )
      .unique();

    return roleRecord?.permissions ?? [];
  },
});

export const upsert = tenantMutation({
  args: {
    roleName: v.string(),
    permissions: v.array(v.string()),
    tier: v.optional(
      v.union(
        v.literal("athlete"),
        v.literal("coach"),
        v.literal("owner"),
        v.literal("admin"),
        v.literal("super_admin")
      )
    ),
  },
  returns: v.id("roles_permissions"),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");

    const existing = await ctx.db
      .query("roles_permissions")
      .withIndex("by_tenantId_roleName", (q) =>
        q.eq("tenantId", ctx.tenantId).eq("roleName", args.roleName)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        permissions: args.permissions,
        tier: args.tier,
      });
      return existing._id;
    }

    return await ctx.db.insert("roles_permissions", {
      tenantId: ctx.tenantId,
      roleName: args.roleName,
      permissions: args.permissions,
      tier: args.tier,
    });
  },
});

export const remove = tenantMutation({
  args: { roleId: v.id("roles_permissions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    enforceRole(ctx.role, "owner");

    const role = await ctx.db.get(args.roleId);
    if (!role) {
      throw new ConvexError("Role not found");
    }
    if (role.tenantId !== ctx.tenantId) {
      throw new ConvexError("Role does not belong to this tenant");
    }
    if (BUILT_IN_ROLES.includes(role.roleName)) {
      throw new ConvexError(
        `Cannot delete built-in role "${role.roleName}"`
      );
    }

    await ctx.db.delete(args.roleId);
    return null;
  },
});

export const seedDefaultRoles = internalMutation({
  args: { tenantId: v.id("tenants") },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const [roleName, permissions] of Object.entries(
      DEFAULT_ROLE_PERMISSIONS
    )) {
      await ctx.db.insert("roles_permissions", {
        tenantId: args.tenantId,
        roleName,
        permissions,
        tier: roleName as "athlete" | "coach" | "admin" | "owner",
      });
    }
    return null;
  },
});
