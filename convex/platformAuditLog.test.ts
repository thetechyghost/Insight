import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

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

  test("list returns audit entries (default limit 50)", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      const actorId = await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      await ctx.db.insert("platform_audit_log", {
        actorId, action: "tenant.created", targetEntity: "tenants",
        timestamp: Date.now(),
      });
      await ctx.db.insert("platform_audit_log", {
        actorId, action: "user.updated", targetEntity: "users",
        timestamp: Date.now(),
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    const entries = await asAdmin.query(api.platformAuditLog.list, {});
    expect(entries).toHaveLength(2);
  });

  test("list filters by actorId when provided", async () => {
    const t = convexTest(schema);

    const { actor1Id } = await t.run(async (ctx) => {
      const actor1Id = await ctx.db.insert("users", { name: "Admin1", email: "admin1@test.com" });
      const actor2Id = await ctx.db.insert("users", { name: "Admin2", email: "admin2@test.com" });
      await ctx.db.insert("platform_audit_log", {
        actorId: actor1Id, action: "tenant.created", targetEntity: "tenants",
        timestamp: Date.now(),
      });
      await ctx.db.insert("platform_audit_log", {
        actorId: actor2Id, action: "user.deleted", targetEntity: "users",
        timestamp: Date.now(),
      });
      return { actor1Id };
    });

    const asAdmin1 = t.withIdentity({ email: "admin1@test.com", subject: "user|admin1" });
    const entries = await asAdmin1.query(api.platformAuditLog.list, { actorId: actor1Id });
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe("tenant.created");
  });
});
