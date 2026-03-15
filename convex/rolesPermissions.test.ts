import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { DEFAULT_ROLE_PERMISSIONS } from "./lib/rbac";

describe("rolesPermissions", () => {
  test("seedDefaultRoles creates 4 roles with correct permissions", async () => {
    const t = convexTest(schema);

    const tenantId = await t.run(async (ctx) => {
      return await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
    });

    // Run the internal seedDefaultRoles mutation
    await t.mutation(internal.rolesPermissions.seedDefaultRoles, { tenantId });

    const roles = await t.run(async (ctx) => {
      return await ctx.db
        .query("roles_permissions")
        .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
        .collect();
    });

    expect(roles).toHaveLength(4);

    const roleMap = Object.fromEntries(
      roles.map((r) => [r.roleName, r.permissions])
    );

    expect(roleMap["athlete"]).toEqual(DEFAULT_ROLE_PERMISSIONS["athlete"]);
    expect(roleMap["coach"]).toEqual(DEFAULT_ROLE_PERMISSIONS["coach"]);
    expect(roleMap["admin"]).toEqual(DEFAULT_ROLE_PERMISSIONS["admin"]);
    expect(roleMap["owner"]).toEqual(DEFAULT_ROLE_PERMISSIONS["owner"]);

    // Verify tiers are set correctly
    const tierMap = Object.fromEntries(
      roles.map((r) => [r.roleName, r.tier])
    );
    expect(tierMap["athlete"]).toBe("athlete");
    expect(tierMap["coach"]).toBe("coach");
    expect(tierMap["admin"]).toBe("admin");
    expect(tierMap["owner"]).toBe("owner");
  });

  test("upsert creates new custom role", async () => {
    const t = convexTest(schema);

    const { tenantId } = await seedOwnerWithTenant(t);

    const asOwner = t.withIdentity({ email: "owner@example.com", subject: "user|owner" });
    const roleId = await asOwner.mutation(api.rolesPermissions.upsert, {
      tenantId,
      roleName: "front_desk",
      permissions: ["view_member_details", "manage_scheduling"],
      tier: "coach",
    });

    expect(roleId).toBeDefined();

    const role = await t.run(async (ctx) => {
      return await ctx.db.get(roleId);
    });

    expect(role!.roleName).toBe("front_desk");
    expect(role!.permissions).toEqual(["view_member_details", "manage_scheduling"]);
    expect(role!.tier).toBe("coach");
    expect(role!.tenantId).toEqual(tenantId);
  });

  test("upsert updates existing role permissions", async () => {
    const t = convexTest(schema);

    const { tenantId, customRoleId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Owner",
        email: "owner@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      await ctx.db.insert("memberships", {
        userId,
        tenantId,
        role: "owner",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      // Create an existing custom role
      const customRoleId = await ctx.db.insert("roles_permissions", {
        tenantId,
        roleName: "custom_role",
        permissions: ["view_member_details"],
        tier: "coach",
      });

      return { tenantId, customRoleId };
    });

    const asOwner = t.withIdentity({ email: "owner@example.com", subject: "user|owner" });
    const returnedId = await asOwner.mutation(api.rolesPermissions.upsert, {
      tenantId,
      roleName: "custom_role",
      permissions: ["view_member_details", "manage_classes", "manage_content"],
      tier: "admin",
    });

    // Should return the same ID (update, not insert)
    expect(returnedId).toEqual(customRoleId);

    const updated = await t.run(async (ctx) => {
      return await ctx.db.get(customRoleId);
    });

    expect(updated!.permissions).toEqual([
      "view_member_details",
      "manage_classes",
      "manage_content",
    ]);
    expect(updated!.tier).toBe("admin");
  });

  test("remove deletes custom role", async () => {
    const t = convexTest(schema);

    const { tenantId, customRoleId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Owner",
        email: "owner@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      await ctx.db.insert("memberships", {
        userId,
        tenantId,
        role: "owner",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      const customRoleId = await ctx.db.insert("roles_permissions", {
        tenantId,
        roleName: "custom_role",
        permissions: ["view_member_details"],
      });

      return { tenantId, customRoleId };
    });

    const asOwner = t.withIdentity({ email: "owner@example.com", subject: "user|owner" });
    await asOwner.mutation(api.rolesPermissions.remove, {
      tenantId,
      roleId: customRoleId,
    });

    const deleted = await t.run(async (ctx) => {
      return await ctx.db.get(customRoleId);
    });

    expect(deleted).toBeNull();
  });

  test("remove rejects deletion of built-in role", async () => {
    const t = convexTest(schema);

    const { tenantId, builtInRoleId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Owner",
        email: "owner@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      await ctx.db.insert("memberships", {
        userId,
        tenantId,
        role: "owner",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      const builtInRoleId = await ctx.db.insert("roles_permissions", {
        tenantId,
        roleName: "athlete",
        permissions: [],
        tier: "athlete",
      });

      return { tenantId, builtInRoleId };
    });

    const asOwner = t.withIdentity({ email: "owner@example.com", subject: "user|owner" });
    await expect(
      asOwner.mutation(api.rolesPermissions.remove, {
        tenantId,
        roleId: builtInRoleId,
      })
    ).rejects.toThrow('Cannot delete built-in role "athlete"');
  });

  test("getMyPermissions returns correct permissions for user role", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Coach",
        email: "coach@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      await ctx.db.insert("memberships", {
        userId,
        tenantId,
        role: "coach",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      // Seed the coach role permissions
      await ctx.db.insert("roles_permissions", {
        tenantId,
        roleName: "coach",
        permissions: [
          "view_member_details",
          "manage_programming",
          "manage_classes",
          "manage_content",
          "manage_challenges",
        ],
        tier: "coach",
      });

      return { tenantId };
    });

    const asCoach = t.withIdentity({ email: "coach@example.com", subject: "user|coach" });
    const permissions = await asCoach.query(api.rolesPermissions.getMyPermissions, {
      tenantId,
    });

    expect(permissions).toEqual([
      "view_member_details",
      "manage_programming",
      "manage_classes",
      "manage_content",
      "manage_challenges",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function seedOwnerWithTenant(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name: "Owner",
      email: "owner@example.com",
    });
    const tenantId = await ctx.db.insert("tenants", {
      name: "Test Gym",
      slug: "test-gym",
    });
    const membershipId = await ctx.db.insert("memberships", {
      userId,
      tenantId,
      role: "owner",
      status: "active",
      isPrimaryGym: true,
      joinDate: "2024-01-01",
    });
    return { userId, tenantId, membershipId };
  });
}
