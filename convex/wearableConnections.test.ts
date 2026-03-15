import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("wearableConnections", () => {
  test("create inserts a new wearable connection", async () => {
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

    const connectionId = await asAlice.mutation(
      api.wearableConnections.create,
      {
        tenantId,
        provider: "garmin",
        accessToken: "token-123",
      }
    );

    expect(connectionId).toBeDefined();

    const connection = await t.run(async (ctx) => ctx.db.get(connectionId));
    expect(connection).not.toBeNull();
    expect(connection!.provider).toBe("garmin");
    expect(connection!.syncStatus).toBe("active");
  });

  test("listMine returns connections for the current user", async () => {
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

    await asBob.mutation(api.wearableConnections.create, {
      tenantId,
      provider: "garmin",
    });
    await asBob.mutation(api.wearableConnections.create, {
      tenantId,
      provider: "whoop",
    });

    const connections = await asBob.query(api.wearableConnections.listMine, {
      tenantId,
    });

    expect(connections).toHaveLength(2);
    const providers = connections.map((c) => c.provider).sort();
    expect(providers).toEqual(["garmin", "whoop"]);
  });

  test("disconnect removes own connection only", async () => {
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

    const connectionId = await asCarol.mutation(
      api.wearableConnections.create,
      {
        tenantId,
        provider: "fitbit",
      }
    );

    await asCarol.mutation(api.wearableConnections.disconnect, {
      tenantId,
      connectionId,
    });

    const connections = await asCarol.query(api.wearableConnections.listMine, {
      tenantId,
    });

    expect(connections).toHaveLength(0);
  });

  test("getByProvider returns the matching connection or null", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Dave",
        email: "dave@test.com",
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

    const asDave = t.withIdentity({
      email: "dave@test.com",
      subject: "user|dave",
    });

    // No connection yet — should return null
    const before = await asDave.query(api.wearableConnections.getByProvider, {
      tenantId,
      provider: "strava",
    });
    expect(before).toBeNull();

    // Create one
    await asDave.mutation(api.wearableConnections.create, {
      tenantId,
      provider: "strava",
    });

    const after = await asDave.query(api.wearableConnections.getByProvider, {
      tenantId,
      provider: "strava",
    });
    expect(after).not.toBeNull();
    expect(after!.provider).toBe("strava");
  });
});
