import { expect, test, describe, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

describe("tenants", () => {
  test("create creates tenant with owner membership and default roles", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema);

    // Seed user first (create mutation requires authed user to exist)
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        name: "Owner",
        email: "owner@example.com",
      });
    });

    const asOwner = t.withIdentity({ email: "owner@example.com", subject: "user|owner" });
    const tenantId = await asOwner.mutation(api.tenants.create, {
      name: "My Gym",
      slug: "my-gym",
      timezone: "America/New_York",
    });

    expect(tenantId).toBeDefined();

    // Verify tenant was created
    const tenant = await t.run(async (ctx) => {
      return await ctx.db.get(tenantId);
    });
    expect(tenant!.name).toBe("My Gym");
    expect(tenant!.slug).toBe("my-gym");
    expect(tenant!.timezone).toBe("America/New_York");

    // Verify owner membership was created
    const membership = await t.run(async (ctx) => {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", "owner@example.com"))
        .unique();
      return await ctx.db
        .query("memberships")
        .withIndex("by_userId_tenantId", (q) =>
          q.eq("userId", user!._id).eq("tenantId", tenantId)
        )
        .unique();
    });

    expect(membership).not.toBeNull();
    expect(membership!.role).toBe("owner");
    expect(membership!.status).toBe("active");
    expect(membership!.isPrimaryGym).toBe(true);

    // Verify default roles were seeded via scheduled function
    // seedDefaultRoles runs via ctx.scheduler.runAfter(0, ...)
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.useRealTimers();

    const roles = await t.run(async (ctx) => {
      return await ctx.db
        .query("roles_permissions")
        .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
        .collect();
    });

    expect(roles.length).toBe(4);
    const roleNames = roles.map((r) => r.roleName).sort();
    expect(roleNames).toEqual(["admin", "athlete", "coach", "owner"]);
  });

  test("create rejects duplicate slug", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        name: "Owner",
        email: "owner@example.com",
      });

      // Pre-seed a tenant with the slug
      await ctx.db.insert("tenants", {
        name: "Existing Gym",
        slug: "taken-slug",
      });
    });

    const asOwner = t.withIdentity({ email: "owner@example.com", subject: "user|owner" });
    await expect(
      asOwner.mutation(api.tenants.create, { name: "New Gym", slug: "taken-slug" })
    ).rejects.toThrow("A gym with this slug already exists");
    vi.useRealTimers();
  });

  test("getBySlug returns tenant for valid slug", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      await ctx.db.insert("tenants", {
        name: "CrossFit Downtown",
        slug: "crossfit-downtown",
      });
    });

    const result = await t.query(api.tenants.getBySlug, {
      slug: "crossfit-downtown",
    });

    expect(result).not.toBeNull();
    expect(result!.name).toBe("CrossFit Downtown");
    expect(result!.slug).toBe("crossfit-downtown");
  });

  test("getBySlug returns null for nonexistent slug", async () => {
    const t = convexTest(schema);

    const result = await t.query(api.tenants.getBySlug, {
      slug: "does-not-exist",
    });

    expect(result).toBeNull();
  });

  test("getMyTenants returns all tenants user belongs to", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Multi-Gym User",
        email: "multi@example.com",
      });

      const tenant1 = await ctx.db.insert("tenants", {
        name: "Gym A",
        slug: "gym-a",
      });

      const tenant2 = await ctx.db.insert("tenants", {
        name: "Gym B",
        slug: "gym-b",
      });

      await ctx.db.insert("memberships", {
        userId,
        tenantId: tenant1,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      await ctx.db.insert("memberships", {
        userId,
        tenantId: tenant2,
        role: "coach",
        status: "active",
        isPrimaryGym: false,
        joinDate: "2024-02-01",
      });
    });

    const asMulti = t.withIdentity({ email: "multi@example.com", subject: "user|multi" });
    const tenants = await asMulti.query(api.tenants.getMyTenants, {});

    expect(tenants).toHaveLength(2);
    const slugs = tenants.map((t) => t.tenant.slug).sort();
    expect(slugs).toEqual(["gym-a", "gym-b"]);
  });

  test("getMyTenants returns empty array for user with no memberships", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        name: "Lone User",
        email: "lone@example.com",
      });
    });

    const asLone = t.withIdentity({ email: "lone@example.com", subject: "user|lone" });
    const tenants = await asLone.query(api.tenants.getMyTenants, {});

    expect(tenants).toEqual([]);
  });

  test("updateBranding succeeds for owner", async () => {
    const t = convexTest(schema);

    const { tenantId } = await seedOwnerWithTenant(t);

    const branding = {
      primaryColor: "#FF0000",
      secondaryColor: "#00FF00",
    };

    const asOwner = t.withIdentity({ email: "owner@example.com", subject: "user|owner" });
    await asOwner.mutation(api.tenants.updateBranding, { tenantId, branding });

    const tenant = await t.run(async (ctx) => {
      return await ctx.db.get(tenantId);
    });

    expect(tenant!.branding).toEqual(branding);
  });

  test("updateBranding rejects for athlete (RBAC)", async () => {
    const t = convexTest(schema);

    const { tenantId } = await seedAthleteWithTenant(t);

    const asAthlete = t.withIdentity({ email: "athlete@example.com", subject: "user|athlete" });
    await expect(
      asAthlete.mutation(api.tenants.updateBranding, {
        tenantId,
        branding: { primaryColor: "#FF0000" },
      })
    ).rejects.toThrow("Insufficient permissions");
  });

  test("updateBranding rejects for coach (RBAC)", async () => {
    const t = convexTest(schema);

    const { tenantId } = await seedCoachWithTenant(t);

    const asCoach = t.withIdentity({ email: "coach@example.com", subject: "user|coach" });
    await expect(
      asCoach.mutation(api.tenants.updateBranding, {
        tenantId,
        branding: { primaryColor: "#FF0000" },
      })
    ).rejects.toThrow("Insufficient permissions");
  });

  test("updateSettings persists timezone and business hours", async () => {
    const t = convexTest(schema);

    const { tenantId } = await seedOwnerWithTenant(t);

    const businessHours = {
      monday: { open: "06:00", close: "21:00" },
      tuesday: { open: "06:00", close: "21:00" },
    };

    const asOwner = t.withIdentity({ email: "owner@example.com", subject: "user|owner" });
    await asOwner.mutation(api.tenants.updateSettings, {
      tenantId,
      timezone: "Europe/London",
      businessHours,
    });

    const tenant = await t.run(async (ctx) => {
      return await ctx.db.get(tenantId);
    });

    expect(tenant!.timezone).toBe("Europe/London");
    expect(tenant!.businessHours).toEqual(businessHours);
  });

  test("tenant isolation: user A cannot access tenant B data", async () => {
    const t = convexTest(schema);

    // Seed user A with tenant A
    const { tenantId: tenantA } = await seedOwnerWithTenant(t);

    // Seed user B with tenant B
    const tenantB = await t.run(async (ctx) => {
      const userB = await ctx.db.insert("users", {
        name: "User B",
        email: "userb@example.com",
      });

      const tenantBId = await ctx.db.insert("tenants", {
        name: "Gym B",
        slug: "gym-b",
      });

      await ctx.db.insert("memberships", {
        userId: userB,
        tenantId: tenantBId,
        role: "owner",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      return tenantBId;
    });

    // User A (owner@example.com) trying to access tenant B should fail
    // because they have no membership in tenant B
    const asOwner = t.withIdentity({ email: "owner@example.com", subject: "user|owner" });
    await expect(
      asOwner.mutation(api.tenants.updateBranding, {
        tenantId: tenantB,
        branding: { primaryColor: "#HACKED" },
      })
    ).rejects.toThrow("You are not a member of this gym");
  });
});

// ---------------------------------------------------------------------------
// Helpers: seed users with specific roles in a tenant
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

async function seedAthleteWithTenant(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name: "Athlete",
      email: "athlete@example.com",
    });

    const tenantId = await ctx.db.insert("tenants", {
      name: "Test Gym",
      slug: "test-gym",
    });

    const membershipId = await ctx.db.insert("memberships", {
      userId,
      tenantId,
      role: "athlete",
      status: "active",
      isPrimaryGym: true,
      joinDate: "2024-01-01",
    });

    return { userId, tenantId, membershipId };
  });
}

async function seedCoachWithTenant(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name: "Coach",
      email: "coach@example.com",
    });

    const tenantId = await ctx.db.insert("tenants", {
      name: "Test Gym",
      slug: "test-gym",
    });

    const membershipId = await ctx.db.insert("memberships", {
      userId,
      tenantId,
      role: "coach",
      status: "active",
      isPrimaryGym: true,
      joinDate: "2024-01-01",
    });

    return { userId, tenantId, membershipId };
  });
}
