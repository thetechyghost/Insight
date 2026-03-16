import { expect, test, describe, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

/** Reusable helper: seed a platform admin */
async function seedPlatformAdmin(t: ReturnType<typeof convexTest>, options?: { email?: string }) {
  const email = options?.email ?? "admin@platform.com";
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "Platform Admin", email });
    const platformAdminId = await ctx.db.insert("platform_admins", {
      userId,
      platformRole: "super_admin" as const,
      status: "active" as const,
    });
    return { userId, platformAdminId };
  });
}

/** Seed a tenant with provisioning record */
async function seedTenantWithProvisioning(
  t: ReturnType<typeof convexTest>,
  requestedBy: any,
  options?: { name?: string; slug?: string; status?: "pending" | "approved" | "active" | "suspended" }
) {
  return await t.run(async (ctx) => {
    const tenantId = await ctx.db.insert("tenants", {
      name: options?.name ?? "Test Gym",
      slug: options?.slug ?? "test-gym",
    });
    const provisioningId = await ctx.db.insert("tenant_provisioning", {
      requestedBy,
      tenantId,
      status: options?.status ?? "active",
    });
    return { tenantId, provisioningId };
  });
}

describe("platformTenants", () => {
  test("list returns tenants with member counts", async () => {
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);
    const { tenantId } = await seedTenantWithProvisioning(t, userId);

    // Add some members
    await t.run(async (ctx) => {
      const memberId = await ctx.db.insert("users", { name: "Member", email: "m@test.com" });
      await ctx.db.insert("memberships", {
        userId: memberId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2025-01-01",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const result = await asAdmin.query(api.platformTenants.list, {});

    expect(result.tenants).toHaveLength(1);
    expect(result.tenants[0].name).toBe("Test Gym");
    expect(result.tenants[0].memberCount).toBe(1);
    expect(result.tenants[0].provisioningStatus).toBe("active");
  });

  test("list rejects unauthenticated request", async () => {
    const t = convexTest(schema);
    await expect(t.query(api.platformTenants.list, {})).rejects.toThrow("Not authenticated");
  });

  test("list rejects non-admin user", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Regular", email: "regular@test.com" });
    });
    const asRegular = t.withIdentity({ email: "regular@test.com", subject: "user|regular" });
    await expect(asRegular.query(api.platformTenants.list, {})).rejects.toThrow("Unauthorized");
  });

  test("getById returns tenant details with provisioning status", async () => {
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);
    const { tenantId } = await seedTenantWithProvisioning(t, userId);

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const result = await asAdmin.query(api.platformTenants.getById, { tenantId });

    expect(result.tenant.name).toBe("Test Gym");
    expect(result.provisioningStatus).toBe("active");
  });

  test("create creates tenant, provisioning record, and owner membership", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    // Seed the owner user
    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Owner", email: "owner@gym.com" });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const result = await asAdmin.mutation(api.platformTenants.create, {
      name: "New Gym",
      slug: "new-gym",
      ownerEmail: "owner@gym.com",
      timezone: "Europe/Oslo",
    });

    expect(result.tenantId).toBeDefined();

    // Verify tenant exists
    const tenant = await t.run(async (ctx) => ctx.db.get(result.tenantId));
    expect(tenant!.name).toBe("New Gym");
    expect(tenant!.slug).toBe("new-gym");
    expect(tenant!.timezone).toBe("Europe/Oslo");

    // Verify provisioning record
    const provisioning = await t.run(async (ctx) => {
      return await ctx.db
        .query("tenant_provisioning")
        .withIndex("by_tenantId", (q) => q.eq("tenantId", result.tenantId))
        .unique();
    });
    expect(provisioning!.status).toBe("active");

    // Verify owner membership
    const membership = await t.run(async (ctx) => {
      return await ctx.db
        .query("memberships")
        .withIndex("by_tenantId", (q) => q.eq("tenantId", result.tenantId))
        .first();
    });
    expect(membership!.role).toBe("owner");
    expect(membership!.status).toBe("active");

    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.useRealTimers();
  });

  test("create rejects duplicate slug", async () => {
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);
    await seedTenantWithProvisioning(t, userId, { slug: "taken-slug" });

    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Owner", email: "owner@gym.com" });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await expect(
      asAdmin.mutation(api.platformTenants.create, {
        name: "Another Gym", slug: "taken-slug", ownerEmail: "owner@gym.com", timezone: "UTC",
      })
    ).rejects.toThrow("slug already in use");
  });

  test("suspend updates provisioning status and logs to audit", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);
    const { tenantId, provisioningId } = await seedTenantWithProvisioning(t, userId);

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await asAdmin.mutation(api.platformTenants.suspend, {
      tenantId,
      reason: "Payment overdue",
    });

    // Verify status changed
    const prov = await t.run(async (ctx) => ctx.db.get(provisioningId));
    expect(prov!.status).toBe("suspended");

    // Verify audit log entry (scheduled — run scheduler)
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const auditEntries = await t.run(async (ctx) =>
      ctx.db.query("platform_audit_log").collect()
    );
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0].action).toBe("tenant.suspended");
    vi.useRealTimers();
  });

  test("reactivate updates provisioning status", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);
    const { tenantId } = await seedTenantWithProvisioning(t, userId, { status: "suspended" });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await asAdmin.mutation(api.platformTenants.reactivate, {
      tenantId,
      reason: "Payment resolved",
    });

    const prov = await t.run(async (ctx) => {
      return await ctx.db
        .query("tenant_provisioning")
        .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
        .unique();
    });
    expect(prov!.status).toBe("active");

    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.useRealTimers();
  });
});
