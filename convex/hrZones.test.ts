import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("hrZones", () => {
  test("getMine returns null when no zones exist", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Alice",
        email: "alice@test.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Gym",
        slug: "gym",
      });
      await ctx.db.insert("memberships", {
        userId,
        tenantId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asAlice = t.withIdentity({
      email: "alice@test.com",
      subject: "user|alice",
    });

    const result = await asAlice.query(api.hrZones.getMine, { tenantId });

    expect(result).toBeNull();
  });

  test("calculate creates HR zones from maxHR", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Bob",
        email: "bob@test.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Gym",
        slug: "gym",
      });
      await ctx.db.insert("memberships", {
        userId,
        tenantId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asBob = t.withIdentity({
      email: "bob@test.com",
      subject: "user|bob",
    });

    const zonesId = await asBob.mutation(api.hrZones.calculate, {
      tenantId,
      maxHR: 200,
    });

    expect(zonesId).toBeDefined();

    const record = await asBob.query(api.hrZones.getMine, { tenantId });

    expect(record).not.toBeNull();
    expect(record!.method).toBe("maxHR");
    expect(record!.maxHR).toBe(200);
    expect(record!.zones).toHaveLength(5);
    // Zone 1 lower should be 50% of 200 = 100
    expect(record!.zones![0].lowerBound).toBe(100);
    // Zone 5 upper should be maxHR = 200
    expect(record!.zones![4].upperBound).toBe(200);
  });

  test("setCustom stores custom zones", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Carol",
        email: "carol@test.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Gym",
        slug: "gym",
      });
      await ctx.db.insert("memberships", {
        userId,
        tenantId,
        role: "athlete",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asCarol = t.withIdentity({
      email: "carol@test.com",
      subject: "user|carol",
    });

    const customZones = [
      { name: "Easy", lowerBound: 100, upperBound: 130 },
      { name: "Moderate", lowerBound: 130, upperBound: 160 },
      { name: "Hard", lowerBound: 160, upperBound: 190 },
    ];

    const zonesId = await asCarol.mutation(api.hrZones.setCustom, {
      tenantId,
      zones: customZones,
    });

    expect(zonesId).toBeDefined();

    const record = await asCarol.query(api.hrZones.getMine, { tenantId });

    expect(record).not.toBeNull();
    expect(record!.method).toBe("custom");
    expect(record!.zones).toHaveLength(3);
    expect(record!.zones![0].name).toBe("Easy");
    expect(record!.zones![2].upperBound).toBe(190);
  });
});
