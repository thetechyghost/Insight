import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

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

describe("platformAuditLog", () => {
  test("create inserts an audit log entry (internal)", async () => {
    const t = convexTest(schema);

    const { actorId } = await t.run(async (ctx) => {
      const actorId = await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      return { actorId };
    });

    const entryId = await t.mutation(internal.platformAuditLog.create, {
      actorId, action: "user.deleted", targetEntity: "users", targetId: "user123",
    });

    const entry = await t.run(async (ctx) => ctx.db.get(entryId));
    expect(entry!.action).toBe("user.deleted");
    expect(entry!.targetEntity).toBe("users");
    expect(entry!.timestamp).toBeDefined();
  });

  test("list returns audit entries with pagination", async () => {
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("platform_audit_log", {
        actorId: userId, action: "tenant.created", targetEntity: "tenants",
        timestamp: Date.now(),
      });
      await ctx.db.insert("platform_audit_log", {
        actorId: userId, action: "user.updated", targetEntity: "users",
        timestamp: Date.now(),
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const result = await asAdmin.query(api.platformAuditLog.list, {});
    expect(result.entries).toHaveLength(2);
    expect(result.nextCursor).toBeUndefined();
  });

  test("list filters by actorId", async () => {
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);

    const { actor2Id } = await t.run(async (ctx) => {
      const actor2Id = await ctx.db.insert("users", { name: "Admin2", email: "admin2@test.com" });
      await ctx.db.insert("platform_audit_log", {
        actorId: userId, action: "tenant.created", targetEntity: "tenants",
        timestamp: Date.now(),
      });
      await ctx.db.insert("platform_audit_log", {
        actorId: actor2Id, action: "user.deleted", targetEntity: "users",
        timestamp: Date.now(),
      });
      return { actor2Id };
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const result = await asAdmin.query(api.platformAuditLog.list, { actorId: userId });
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].action).toBe("tenant.created");
  });

  test("list filters by action", async () => {
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("platform_audit_log", {
        actorId: userId, action: "tenant.created", targetEntity: "tenants",
        timestamp: Date.now(),
      });
      await ctx.db.insert("platform_audit_log", {
        actorId: userId, action: "tenant.suspended", targetEntity: "tenants",
        timestamp: Date.now(),
      });
      await ctx.db.insert("platform_audit_log", {
        actorId: userId, action: "user.updated", targetEntity: "users",
        timestamp: Date.now(),
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const result = await asAdmin.query(api.platformAuditLog.list, { action: "tenant.created" });
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].action).toBe("tenant.created");
  });

  test("list filters by targetEntity", async () => {
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("platform_audit_log", {
        actorId: userId, action: "tenant.created", targetEntity: "tenants",
        timestamp: Date.now(),
      });
      await ctx.db.insert("platform_audit_log", {
        actorId: userId, action: "user.updated", targetEntity: "users",
        timestamp: Date.now(),
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const result = await asAdmin.query(api.platformAuditLog.list, { targetEntity: "tenants" });
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].targetEntity).toBe("tenants");
  });

  test("list supports cursor pagination", async () => {
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);

    await t.run(async (ctx) => {
      for (let i = 0; i < 5; i++) {
        await ctx.db.insert("platform_audit_log", {
          actorId: userId, action: `action.${i}`, targetEntity: "tenants",
          timestamp: Date.now() + i,
        });
      }
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });

    const page1 = await asAdmin.query(api.platformAuditLog.list, { limit: 2 });
    expect(page1.entries).toHaveLength(2);
    expect(page1.nextCursor).toBe("2");

    const page2 = await asAdmin.query(api.platformAuditLog.list, { limit: 2, cursor: page1.nextCursor });
    expect(page2.entries).toHaveLength(2);
    expect(page2.nextCursor).toBe("4");

    const page3 = await asAdmin.query(api.platformAuditLog.list, { limit: 2, cursor: page2.nextCursor });
    expect(page3.entries).toHaveLength(1);
    expect(page3.nextCursor).toBeUndefined();
  });

  test("getActions returns distinct action values sorted", async () => {
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("platform_audit_log", {
        actorId: userId, action: "tenant.created", targetEntity: "tenants", timestamp: Date.now(),
      });
      await ctx.db.insert("platform_audit_log", {
        actorId: userId, action: "user.updated", targetEntity: "users", timestamp: Date.now(),
      });
      await ctx.db.insert("platform_audit_log", {
        actorId: userId, action: "tenant.created", targetEntity: "tenants", timestamp: Date.now(),
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const actions = await asAdmin.query(api.platformAuditLog.getActions, {});
    expect(actions).toEqual(["tenant.created", "user.updated"]);
  });

  test("list rejects unauthenticated request", async () => {
    const t = convexTest(schema);
    await expect(t.query(api.platformAuditLog.list, {})).rejects.toThrow("Not authenticated");
  });

  test("list rejects non-admin user", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Regular", email: "regular@test.com" });
    });
    const asRegular = t.withIdentity({ email: "regular@test.com", subject: "user|regular" });
    await expect(asRegular.query(api.platformAuditLog.list, {})).rejects.toThrow("Unauthorized");
  });
});
