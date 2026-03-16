import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedPlatformAdmin(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "Admin", email: "admin@platform.com" });
    await ctx.db.insert("platform_admins", {
      userId, platformRole: "super_admin" as const, status: "active" as const,
    });
    return { userId };
  });
}

describe("platformMetrics", () => {
  test("getOverview returns aggregate counts", async () => {
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);

    // Seed some data
    await t.run(async (ctx) => {
      const tenantId = await ctx.db.insert("tenants", { name: "Gym A", slug: "gym-a" });
      const memberId = await ctx.db.insert("users", { name: "Athlete", email: "a@test.com" });
      await ctx.db.insert("memberships", {
        userId: memberId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2025-01-01",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const overview = await asAdmin.query(api.platformMetrics.getOverview, {});

    expect(overview.totalTenants).toBe(1);
    expect(overview.totalUsers).toBeGreaterThanOrEqual(2); // admin + athlete
    expect(overview.activeToday).toBeGreaterThanOrEqual(0);
  });

  test("getOverview rejects non-admin", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Regular", email: "regular@test.com" });
    });
    const asRegular = t.withIdentity({ email: "regular@test.com", subject: "user|regular" });
    await expect(asRegular.query(api.platformMetrics.getOverview, {})).rejects.toThrow("Unauthorized");
  });

  test("getTenantHealthFlags returns flagged tenants", async () => {
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);

    await t.run(async (ctx) => {
      const tenantId = await ctx.db.insert("tenants", { name: "Suspended Gym", slug: "suspended" });
      await ctx.db.insert("tenant_provisioning", {
        requestedBy: userId, tenantId, status: "suspended",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const flags = await asAdmin.query(api.platformMetrics.getTenantHealthFlags, {});

    expect(flags).toHaveLength(1);
    expect(flags[0].issue).toBe("suspended");
  });
});
