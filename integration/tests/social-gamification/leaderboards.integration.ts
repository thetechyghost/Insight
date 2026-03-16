import { describe, test, expect, beforeAll } from "vitest";
import { ConvexHttpClient } from "convex/browser";
import { createTestClient, createAuthenticatedClient } from "../../clients/convex-client";
import { getAuthToken } from "../../clients/auth";
import { loadSeedContext } from "../../helpers/load-context";
import { expectToThrow, expectValidId } from "../../helpers/assertions";
import { api } from "../../../convex/_generated/api";
import type { SeedContext } from "../../seed/types";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * [FR-SC] Leaderboards
 *
 * Tests the leaderboard subsystem:
 * - CRUD lifecycle: create, list, getById, update, remove
 * - RBAC enforcement: coach+ required for create/update/remove
 * - All users can read leaderboards
 * - Tenant isolation on all operations
 * - Auth enforcement on all endpoints
 */
describe("[FR-SC] Leaderboards", () => {
  let ctx: SeedContext;
  let unauthenticatedClient: ConvexHttpClient;

  let createdLeaderboardId: Id<"leaderboards"> | null = null;

  beforeAll(() => {
    ctx = loadSeedContext();
    unauthenticatedClient = createTestClient();
  });

  async function clientFor(userKey: string) {
    const token = await getAuthToken(ctx.users[userKey].email!);
    return createAuthenticatedClient(token);
  }

  const tenantId = () => ctx.tenants.cfAlpha.id as Id<"tenants">;
  const betaTenantId = () => ctx.tenants.cfBeta.id as Id<"tenants">;

  // ---- Auth enforcement ----

  test("list rejects unauthenticated requests", async () => {
    await expectToThrow(
      () => unauthenticatedClient.query(api.leaderboards.list, { tenantId: tenantId() }),
      "Not authenticated"
    );
  });

  test("create rejects unauthenticated requests", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.leaderboards.create, {
          tenantId: tenantId(),
          scope: "gym",
          timeWindow: "weekly",
        }),
      "Not authenticated"
    );
  });

  test("update rejects unauthenticated requests", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.leaderboards.update, {
          tenantId: tenantId(),
          leaderboardId: "placeholder" as Id<"leaderboards">,
          scope: "gym",
        }),
      "Not authenticated"
    );
  });

  test("remove rejects unauthenticated requests", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.leaderboards.remove, {
          tenantId: tenantId(),
          leaderboardId: "placeholder" as Id<"leaderboards">,
        }),
      "Not authenticated"
    );
  });

  // ---- RBAC enforcement ----

  test("athlete cannot create a leaderboard (coach+ required)", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.mutation(api.leaderboards.create, {
          tenantId: tenantId(),
          scope: "gym",
          timeWindow: "weekly",
        }),
      "Insufficient role"
    );
  });

  test("athlete cannot update a leaderboard (coach+ required)", async () => {
    // Create one first as coach
    const coachClient = await clientFor("bob");
    const lbId = await coachClient.mutation(api.leaderboards.create, {
      tenantId: tenantId(),
      scope: "gym",
      timeWindow: "monthly",
    });

    const athleteClient = await clientFor("dave");
    await expectToThrow(
      () =>
        athleteClient.mutation(api.leaderboards.update, {
          tenantId: tenantId(),
          leaderboardId: lbId,
          scope: "class",
        }),
      "Insufficient role"
    );
  });

  test("athlete cannot remove a leaderboard (coach+ required)", async () => {
    const coachClient = await clientFor("bob");
    const lbId = await coachClient.mutation(api.leaderboards.create, {
      tenantId: tenantId(),
      scope: "gym",
      timeWindow: "daily",
    });

    const athleteClient = await clientFor("dave");
    await expectToThrow(
      () =>
        athleteClient.mutation(api.leaderboards.remove, {
          tenantId: tenantId(),
          leaderboardId: lbId,
        }),
      "Insufficient role"
    );
  });

  // ---- CRUD happy path ----

  test("coach can create a leaderboard", async () => {
    const client = await clientFor("bob");

    createdLeaderboardId = await client.mutation(api.leaderboards.create, {
      tenantId: tenantId(),
      scope: "gym",
      timeWindow: "weekly",
    });

    expectValidId(createdLeaderboardId);
  });

  test("admin can create a leaderboard", async () => {
    const client = await clientFor("carol");

    const id = await client.mutation(api.leaderboards.create, {
      tenantId: tenantId(),
      scope: "class",
      timeWindow: "monthly",
    });

    expectValidId(id);
  });

  test("owner can create a leaderboard", async () => {
    const client = await clientFor("alice");

    const id = await client.mutation(api.leaderboards.create, {
      tenantId: tenantId(),
      scope: "global",
      timeWindow: "all_time",
    });

    expectValidId(id);
  });

  test("list returns leaderboards for the tenant", async () => {
    const client = await clientFor("dave");

    const leaderboards = await client.query(api.leaderboards.list, {
      tenantId: tenantId(),
    });

    expect(leaderboards.length).toBeGreaterThan(0);
    for (const lb of leaderboards) {
      expect(lb.tenantId).toBe(tenantId());
    }
  });

  test("athlete can read leaderboards (no RBAC restriction on reads)", async () => {
    const client = await clientFor("dave");

    const leaderboards = await client.query(api.leaderboards.list, {
      tenantId: tenantId(),
    });

    expect(Array.isArray(leaderboards)).toBe(true);
  });

  test("getById returns leaderboard details", async () => {
    if (!createdLeaderboardId) return;

    const client = await clientFor("dave");

    const lb = await client.query(api.leaderboards.getById, {
      tenantId: tenantId(),
      leaderboardId: createdLeaderboardId,
    });

    expect(lb._id).toBe(createdLeaderboardId);
    expect(lb.scope).toBe("gym");
    expect(lb.timeWindow).toBe("weekly");
    expect(lb.tenantId).toBe(tenantId());
  });

  test("coach can update a leaderboard", async () => {
    if (!createdLeaderboardId) return;

    const client = await clientFor("bob");

    await client.mutation(api.leaderboards.update, {
      tenantId: tenantId(),
      leaderboardId: createdLeaderboardId,
      scope: "class",
      timeWindow: "monthly",
    });

    const updated = await client.query(api.leaderboards.getById, {
      tenantId: tenantId(),
      leaderboardId: createdLeaderboardId,
    });

    expect(updated.scope).toBe("class");
    expect(updated.timeWindow).toBe("monthly");
  });

  test("coach can remove a leaderboard", async () => {
    const client = await clientFor("bob");

    const lbId = await client.mutation(api.leaderboards.create, {
      tenantId: tenantId(),
      scope: "gym",
      timeWindow: "daily",
    });

    await client.mutation(api.leaderboards.remove, {
      tenantId: tenantId(),
      leaderboardId: lbId,
    });

    await expectToThrow(
      () =>
        client.query(api.leaderboards.getById, {
          tenantId: tenantId(),
          leaderboardId: lbId,
        }),
      "not found"
    );
  });

  // ---- Tenant isolation ----

  test("user cannot list leaderboards from tenant they don't belong to", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.query(api.leaderboards.list, {
          tenantId: betaTenantId(),
        }),
      "not a member"
    );
  });

  test("getById rejects leaderboard from another tenant", async () => {
    // Create a leaderboard in cf-beta
    const graceClient = await clientFor("grace");
    const betaLbId = await graceClient.mutation(api.leaderboards.create, {
      tenantId: betaTenantId(),
      scope: "gym",
      timeWindow: "weekly",
    });

    // Dave cannot access it via cf-alpha
    const daveClient = await clientFor("dave");
    await expectToThrow(
      () =>
        daveClient.query(api.leaderboards.getById, {
          tenantId: tenantId(),
          leaderboardId: betaLbId,
        }),
      "not found"
    );
  });

  test("coach cannot modify leaderboard from another tenant", async () => {
    const graceClient = await clientFor("grace");
    const betaLbId = await graceClient.mutation(api.leaderboards.create, {
      tenantId: betaTenantId(),
      scope: "gym",
      timeWindow: "all_time",
    });

    const bobClient = await clientFor("bob");
    await expectToThrow(
      () =>
        bobClient.mutation(api.leaderboards.update, {
          tenantId: tenantId(),
          leaderboardId: betaLbId,
          scope: "class",
        }),
      "not found"
    );
  });
});
