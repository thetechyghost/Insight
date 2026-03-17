import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedPlatformAdmin(t: ReturnType<typeof convexTest>, options?: { email?: string }) {
  const email = options?.email ?? "admin@platform.com";
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "Platform Admin", email });
    await ctx.db.insert("platform_admins", {
      userId,
      platformRole: "super_admin" as const,
      status: "active" as const,
    });
    return { userId };
  });
}

describe("platformAlerts", () => {
  test("getThresholds returns null when not configured", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const result = await asAdmin.query(api.platformAlerts.getThresholds, {});
    expect(result).toBeNull();
  });

  test("setThresholds creates config and getThresholds reads it", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await asAdmin.mutation(api.platformAlerts.setThresholds, {
      lowActivityDays: 14,
      maxErrorRate: 5,
      minMemberCount: 10,
    });

    const result = await asAdmin.query(api.platformAlerts.getThresholds, {});
    expect(result).toEqual({
      lowActivityDays: 14,
      maxErrorRate: 5,
      minMemberCount: 10,
    });
  });

  test("setThresholds updates existing config", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await asAdmin.mutation(api.platformAlerts.setThresholds, {
      lowActivityDays: 7,
      maxErrorRate: 3,
      minMemberCount: 5,
    });

    // Update
    await asAdmin.mutation(api.platformAlerts.setThresholds, {
      lowActivityDays: 30,
      maxErrorRate: 10,
      minMemberCount: 20,
    });

    const result = await asAdmin.query(api.platformAlerts.getThresholds, {});
    expect(result).toEqual({
      lowActivityDays: 30,
      maxErrorRate: 10,
      minMemberCount: 20,
    });

    // Verify only one config entry exists
    const configs = await t.run(async (ctx) =>
      ctx.db.query("platform_config").withIndex("by_key", (q) => q.eq("key", "alert_thresholds")).collect()
    );
    expect(configs).toHaveLength(1);
  });

  test("getThresholds rejects unauthenticated request", async () => {
    const t = convexTest(schema);
    await expect(t.query(api.platformAlerts.getThresholds, {})).rejects.toThrow("Not authenticated");
  });
});
