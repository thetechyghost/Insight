import { expect, test, describe, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

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

describe("platformFeatureFlags", () => {
  test("list returns all feature flags", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("feature_flags", {
        name: "beta_dashboard",
        status: "enabled",
      });
      await ctx.db.insert("feature_flags", {
        name: "alpha_feature",
        status: "disabled",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const flags = await asAdmin.query(api.platformFeatureFlags.list, {});

    expect(flags).toHaveLength(2);
    // Ordered by name index
    expect(flags[0].name).toBe("alpha_feature");
    expect(flags[1].name).toBe("beta_dashboard");
  });

  test("getByName returns a single flag", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("feature_flags", {
        name: "test_flag",
        status: "enabled",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const flag = await asAdmin.query(api.platformFeatureFlags.getByName, { name: "test_flag" });
    expect(flag).not.toBeNull();
    expect(flag!.name).toBe("test_flag");

    const missing = await asAdmin.query(api.platformFeatureFlags.getByName, { name: "nonexistent" });
    expect(missing).toBeNull();
  });

  test("create inserts a flag and audit logs", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const flagId = await asAdmin.mutation(api.platformFeatureFlags.create, {
      name: "new_feature",
      status: "enabled",
    });

    expect(flagId).toBeDefined();

    const flag = await t.run(async (ctx) => ctx.db.get(flagId));
    expect(flag!.name).toBe("new_feature");
    expect(flag!.status).toBe("enabled");

    // Verify audit log
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const auditEntries = await t.run(async (ctx) =>
      ctx.db.query("platform_audit_log").collect()
    );
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0].action).toBe("feature_flag.created");
    vi.useRealTimers();
  });

  test("create rejects duplicate name", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("feature_flags", {
        name: "existing_flag",
        status: "disabled",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await expect(
      asAdmin.mutation(api.platformFeatureFlags.create, {
        name: "existing_flag",
        status: "enabled",
      })
    ).rejects.toThrow("already exists");
  });

  test("create rejects empty name", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await expect(
      asAdmin.mutation(api.platformFeatureFlags.create, {
        name: "   ",
        status: "enabled",
      })
    ).rejects.toThrow("cannot be empty");
  });

  test("create requires rolloutPercentage for percentage_rollout status", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await expect(
      asAdmin.mutation(api.platformFeatureFlags.create, {
        name: "rollout_flag",
        status: "percentage_rollout",
      })
    ).rejects.toThrow("Rollout percentage is required");
  });

  test("update patches flag and captures before/after in audit", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    const flagId = await t.run(async (ctx) => {
      return await ctx.db.insert("feature_flags", {
        name: "toggle_me",
        status: "disabled",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await asAdmin.mutation(api.platformFeatureFlags.update, {
      flagId,
      status: "enabled",
    });

    const flag = await t.run(async (ctx) => ctx.db.get(flagId));
    expect(flag!.status).toBe("enabled");

    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const auditEntries = await t.run(async (ctx) =>
      ctx.db.query("platform_audit_log").collect()
    );
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0].action).toBe("feature_flag.updated");
    expect(auditEntries[0].beforeValue).toMatchObject({ status: "disabled" });
    expect(auditEntries[0].afterValue).toMatchObject({ status: "enabled" });
    vi.useRealTimers();
  });

  test("update rejects non-existent flag", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });

    // Create a valid ID first, then delete it
    const flagId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("feature_flags", { name: "temp", status: "disabled" });
      await ctx.db.delete(id);
      return id;
    });

    await expect(
      asAdmin.mutation(api.platformFeatureFlags.update, { flagId, status: "enabled" })
    ).rejects.toThrow("not found");
  });

  test("remove deletes flag and audit logs", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    const flagId = await t.run(async (ctx) => {
      return await ctx.db.insert("feature_flags", {
        name: "delete_me",
        status: "disabled",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await asAdmin.mutation(api.platformFeatureFlags.remove, { flagId });

    const flag = await t.run(async (ctx) => ctx.db.get(flagId));
    expect(flag).toBeNull();

    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const auditEntries = await t.run(async (ctx) =>
      ctx.db.query("platform_audit_log").collect()
    );
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0].action).toBe("feature_flag.deleted");
    vi.useRealTimers();
  });

  test("list rejects unauthenticated request", async () => {
    const t = convexTest(schema);
    await expect(t.query(api.platformFeatureFlags.list, {})).rejects.toThrow("Not authenticated");
  });

  test("list rejects non-admin user", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Regular", email: "regular@test.com" });
    });
    const asRegular = t.withIdentity({ email: "regular@test.com", subject: "user|regular" });
    await expect(asRegular.query(api.platformFeatureFlags.list, {})).rejects.toThrow("Unauthorized");
  });
});
