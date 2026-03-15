import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

describe("points", () => {
  test("award inserts a point record (internal)", async () => {
    const t = convexTest(schema);

    const { userId, tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      return { userId, tenantId };
    });

    const pointId = await t.mutation(internal.points.award, {
      userId, tenantId, actionType: "workout_logged", pointsEarned: 50,
    });

    const record = await t.run(async (ctx) => ctx.db.get(pointId));
    expect(record!.pointsEarned).toBe(50);
    expect(record!.actionType).toBe("workout_logged");
  });

  test("getMyBalance returns sum of all points", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      await ctx.db.insert("points", {
        userId, tenantId, actionType: "workout", pointsEarned: 100, timestamp: Date.now(),
      });
      await ctx.db.insert("points", {
        userId, tenantId, actionType: "check_in", pointsEarned: 25, timestamp: Date.now(),
      });
      return { tenantId };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });
    const balance = await asAlice.query(api.points.getMyBalance, { tenantId });
    expect(balance).toBe(125);
  });

  test("getHistory returns point records in desc order", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      await ctx.db.insert("points", {
        userId, tenantId, actionType: "first", pointsEarned: 10, timestamp: 1000,
      });
      await ctx.db.insert("points", {
        userId, tenantId, actionType: "second", pointsEarned: 20, timestamp: 2000,
      });
      return { tenantId };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });
    const history = await asAlice.query(api.points.getHistory, { tenantId });
    expect(history).toHaveLength(2);
  });
});
