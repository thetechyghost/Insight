import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

describe("devices", () => {
  test("register creates a new device (admin only)", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "admin", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });

    const deviceId = await asAdmin.mutation(
      api.devices.register,
      { tenantId, name: "Rower 1", type: "RowErg" },
    );

    const device = await t.run(async (ctx) => ctx.db.get(deviceId));
    expect(device!.name).toBe("Rower 1");
    expect(device!.isOnline).toBe(false);
  });

  test("listByTenant returns devices for coach role", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Coach", email: "coach@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "coach", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      await ctx.db.insert("devices", {
        tenantId, name: "Rower 1", type: "RowErg", isOnline: true,
      });
      await ctx.db.insert("devices", {
        tenantId, name: "Bike 1", type: "BikeErg", isOnline: false,
      });
      return { tenantId };
    });

    const asCoach = t.withIdentity({ email: "coach@test.com", subject: "user|coach" });
    const devices = await asCoach.query(api.devices.listByTenant, { tenantId });
    expect(devices).toHaveLength(2);
  });

  test("updateStatus changes device online status (internal)", async () => {
    const t = convexTest(schema);

    const { deviceId } = await t.run(async (ctx) => {
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      const deviceId = await ctx.db.insert("devices", {
        tenantId, name: "Rower 1", type: "RowErg", isOnline: false,
      });
      return { deviceId };
    });

    await t.mutation(internal.devices.updateStatus, {
      deviceId, isOnline: true, lastSeenAt: Date.now(),
    });

    const device = await t.run(async (ctx) => ctx.db.get(deviceId));
    expect(device!.isOnline).toBe(true);
  });

  test("deregister removes a device (admin only)", async () => {
    const t = convexTest(schema);

    const { tenantId, deviceId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "admin", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const deviceId = await ctx.db.insert("devices", {
        tenantId, name: "Rower 1", type: "RowErg", isOnline: false,
      });
      return { tenantId, deviceId };
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    await asAdmin.mutation(api.devices.deregister, { tenantId, deviceId });

    const deleted = await t.run(async (ctx) => ctx.db.get(deviceId));
    expect(deleted).toBeNull();
  });

  test("deregister rejects device from another tenant", async () => {
    const t = convexTest(schema);

    const { tenantId1, deviceIdB } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      const tenantId1 = await ctx.db.insert("tenants", { name: "Gym A", slug: "gym-a" });
      const tenantId2 = await ctx.db.insert("tenants", { name: "Gym B", slug: "gym-b" });
      await ctx.db.insert("memberships", {
        userId, tenantId: tenantId1, role: "admin", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const deviceIdB = await ctx.db.insert("devices", {
        tenantId: tenantId2, name: "Ski 1", type: "SkiErg", isOnline: false,
      });
      return { tenantId1, deviceIdB };
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });

    await expect(
      asAdmin.mutation(api.devices.deregister, { tenantId: tenantId1, deviceId: deviceIdB })
    ).rejects.toThrow("Device does not belong to this tenant");
  });
});
