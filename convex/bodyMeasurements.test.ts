import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("bodyMeasurements", () => {
  test("create and listMine returns the measurement", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      const userId = (await ctx.db.query("users").first())!._id;
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });

    await asAlice.mutation(
      api.bodyMeasurements.create,
      { tenantId, date: "2024-06-01", waist: 80, chest: 100 },
    );

    const list = await asAlice.query(
      api.bodyMeasurements.listMine,
      { tenantId },
    );

    expect(list).toHaveLength(1);
    expect(list[0].waist).toBe(80);
    expect(list[0].date).toBe("2024-06-01");
  });

  test("getByDate returns measurement for the requested date", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Bob", email: "bob@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      const userId = (await ctx.db.query("users").first())!._id;
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asBob = t.withIdentity({ email: "bob@test.com", subject: "user|bob" });

    await asBob.mutation(
      api.bodyMeasurements.create,
      { tenantId, date: "2024-06-15", hips: 95 },
    );

    const result = await asBob.query(
      api.bodyMeasurements.getByDate,
      { tenantId, date: "2024-06-15" },
    );

    expect(result).not.toBeNull();
    expect(result!.hips).toBe(95);
  });

  test("update modifies an existing measurement", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Carol", email: "carol@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      const userId = (await ctx.db.query("users").first())!._id;
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asCarol = t.withIdentity({ email: "carol@test.com", subject: "user|carol" });

    const measurementId = await asCarol.mutation(
      api.bodyMeasurements.create,
      { tenantId, date: "2024-06-01", waist: 80 },
    );

    await asCarol.mutation(
      api.bodyMeasurements.update,
      { tenantId, measurementId, waist: 78 },
    );

    const updated = await t.run(async (ctx) => ctx.db.get(measurementId));
    expect(updated!.waist).toBe(78);
  });

  test("remove deletes a measurement", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Dave", email: "dave@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      const userId = (await ctx.db.query("users").first())!._id;
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asDave = t.withIdentity({ email: "dave@test.com", subject: "user|dave" });

    const measurementId = await asDave.mutation(
      api.bodyMeasurements.create,
      { tenantId, date: "2024-06-01", waist: 80 },
    );

    await asDave.mutation(
      api.bodyMeasurements.remove,
      { tenantId, measurementId },
    );

    const deleted = await t.run(async (ctx) => ctx.db.get(measurementId));
    expect(deleted).toBeNull();
  });

  test("update rejects when user does not own the measurement", async () => {
    const t = convexTest(schema);

    const { tenantId, measurementId } = await t.run(async (ctx) => {
      const userId1 = await ctx.db.insert("users", { name: "Owner", email: "owner@test.com" });
      await ctx.db.insert("users", { name: "Other", email: "other@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId: userId1, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const otherUserId = (await ctx.db.query("users").collect())[1]._id;
      await ctx.db.insert("memberships", {
        userId: otherUserId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const measurementId = await ctx.db.insert("body_measurements", {
        userId: userId1, tenantId, date: "2024-06-01", waist: 80,
      });
      return { tenantId, measurementId };
    });

    const asOther = t.withIdentity({ email: "other@test.com", subject: "user|other" });

    await expect(
      asOther.mutation(
        api.bodyMeasurements.update,
        { tenantId, measurementId, waist: 70 },
      )
    ).rejects.toThrow("Body measurement not found");
  });
});
