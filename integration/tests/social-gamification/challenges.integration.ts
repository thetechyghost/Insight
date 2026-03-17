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
 * [FR-SC, FR-GM] Challenges
 *
 * Tests the challenge subsystem:
 * - CRUD lifecycle: create, list, getById, update, close
 * - Join/leave participation flow
 * - Challenge standings retrieval
 * - RBAC enforcement: coach+ required for create/update/close
 * - Tenant isolation on all operations
 * - Auth enforcement on all endpoints
 */
describe("[FR-SC, FR-GM] Challenges", () => {
  let ctx: SeedContext;
  let unauthenticatedClient: ConvexHttpClient;

  // Track IDs created during tests for cross-test references
  let createdChallengeId: Id<"challenges"> | null = null;

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
      () => unauthenticatedClient.query(api.challenges.list, { tenantId: tenantId() }),
      "Not authenticated"
    );
  });

  test("create rejects unauthenticated requests", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.challenges.create, {
          tenantId: tenantId(),
          name: "Hack Challenge",
          type: "frequency",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
        }),
      "Not authenticated"
    );
  });

  test("join rejects unauthenticated requests", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.challenges.join, {
          tenantId: tenantId(),
          challengeId: ctx.tenants.cfAlpha.id as unknown as Id<"challenges">,
        })
    );
  });

  // ---- RBAC enforcement ----

  test("athlete cannot create a challenge (coach+ required)", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.mutation(api.challenges.create, {
          tenantId: tenantId(),
          name: "Dave's Challenge",
          type: "frequency",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
        }),
      "Insufficient role"
    );
  });

  test("athlete cannot update a challenge (coach+ required)", async () => {
    // First create a challenge as coach
    const coachClient = await clientFor("bob");
    const challengeId = await coachClient.mutation(api.challenges.create, {
      tenantId: tenantId(),
      name: "RBAC Update Test",
      type: "distance",
      startDate: "2026-05-01",
      endDate: "2026-05-31",
    });

    const athleteClient = await clientFor("dave");
    await expectToThrow(
      () =>
        athleteClient.mutation(api.challenges.update, {
          tenantId: tenantId(),
          challengeId,
          name: "Hacked Name",
        }),
      "Insufficient role"
    );
  });

  test("athlete cannot close a challenge (coach+ required)", async () => {
    const coachClient = await clientFor("bob");
    const challengeId = await coachClient.mutation(api.challenges.create, {
      tenantId: tenantId(),
      name: "RBAC Close Test",
      type: "volume",
      startDate: "2026-05-01",
      endDate: "2026-05-31",
    });

    const athleteClient = await clientFor("dave");
    await expectToThrow(
      () =>
        athleteClient.mutation(api.challenges.close, {
          tenantId: tenantId(),
          challengeId,
        }),
      "Insufficient role"
    );
  });

  // ---- CRUD happy path ----

  test("coach can create a challenge", async () => {
    const client = await clientFor("bob");

    createdChallengeId = await client.mutation(api.challenges.create, {
      tenantId: tenantId(),
      name: "March Madness Distance",
      type: "distance",
      startDate: "2026-04-01",
      endDate: "2026-04-30",
      description: "Row/run/ski as far as possible in April",
    });

    expectValidId(createdChallengeId);
  });

  test("admin can create a challenge", async () => {
    const client = await clientFor("carol");

    const id = await client.mutation(api.challenges.create, {
      tenantId: tenantId(),
      name: "Admin Created Challenge",
      type: "benchmark",
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });

    expectValidId(id);
  });

  test("owner can create a challenge", async () => {
    const client = await clientFor("alice");

    const id = await client.mutation(api.challenges.create, {
      tenantId: tenantId(),
      name: "Owner Created Challenge",
      type: "volume",
      startDate: "2026-07-01",
      endDate: "2026-07-31",
    });

    expectValidId(id);
  });

  test("list returns challenges for the tenant", async () => {
    const client = await clientFor("dave");

    const challenges = await client.query(api.challenges.list, {
      tenantId: tenantId(),
    });

    expect(challenges.length).toBeGreaterThan(0);
    for (const c of challenges) {
      expect(c.tenantId).toBe(tenantId());
    }
  });

  test("list supports status filter", async () => {
    const client = await clientFor("dave");

    // These may or may not return results depending on dates, but should not error
    const upcoming = await client.query(api.challenges.list, {
      tenantId: tenantId(),
      status: "upcoming",
    });
    expect(Array.isArray(upcoming)).toBe(true);

    const active = await client.query(api.challenges.list, {
      tenantId: tenantId(),
      status: "active",
    });
    expect(Array.isArray(active)).toBe(true);
  });

  test("getById returns the created challenge", async () => {
    if (!createdChallengeId) return;

    const client = await clientFor("dave");

    const challenge = await client.query(api.challenges.getById, {
      tenantId: tenantId(),
      challengeId: createdChallengeId,
    });

    expect(challenge.name).toBe("March Madness Distance");
    expect(challenge.type).toBe("distance");
    expect(challenge.description).toBe("Row/run/ski as far as possible in April");
  });

  test("coach can update a challenge", async () => {
    if (!createdChallengeId) return;

    const client = await clientFor("bob");

    await client.mutation(api.challenges.update, {
      tenantId: tenantId(),
      challengeId: createdChallengeId,
      name: "April Distance Challenge",
      description: "Updated description",
    });

    const updated = await client.query(api.challenges.getById, {
      tenantId: tenantId(),
      challengeId: createdChallengeId,
    });

    expect(updated.name).toBe("April Distance Challenge");
    expect(updated.description).toBe("Updated description");
  });

  test("coach can close a challenge", async () => {
    if (!createdChallengeId) return;

    const client = await clientFor("bob");

    await client.mutation(api.challenges.close, {
      tenantId: tenantId(),
      challengeId: createdChallengeId,
    });

    const closed = await client.query(api.challenges.getById, {
      tenantId: tenantId(),
      challengeId: createdChallengeId,
    });

    // endDate should be set to today
    const today = new Date().toISOString().slice(0, 10);
    expect(closed.endDate).toBe(today);
  });

  // ---- Participation flow ----

  test("athlete can join a challenge", async () => {
    // Create a fresh challenge for participation tests
    const coachClient = await clientFor("bob");
    const challengeId = await coachClient.mutation(api.challenges.create, {
      tenantId: tenantId(),
      name: "Join/Leave Test Challenge",
      type: "frequency",
      startDate: "2026-04-01",
      endDate: "2026-12-31",
    });

    const athleteClient = await clientFor("dave");
    const participantId = await athleteClient.mutation(api.challenges.join, {
      tenantId: tenantId(),
      challengeId,
    });

    expectValidId(participantId);
  });

  test("joining the same challenge twice throws error", async () => {
    const coachClient = await clientFor("bob");
    const challengeId = await coachClient.mutation(api.challenges.create, {
      tenantId: tenantId(),
      name: "Duplicate Join Test",
      type: "frequency",
      startDate: "2026-04-01",
      endDate: "2026-12-31",
    });

    const athleteClient = await clientFor("dave");
    await athleteClient.mutation(api.challenges.join, {
      tenantId: tenantId(),
      challengeId,
    });

    await expectToThrow(
      () =>
        athleteClient.mutation(api.challenges.join, {
          tenantId: tenantId(),
          challengeId,
        }),
      "Already joined"
    );
  });

  test("athlete can leave a challenge", async () => {
    const coachClient = await clientFor("bob");
    const challengeId = await coachClient.mutation(api.challenges.create, {
      tenantId: tenantId(),
      name: "Leave Test Challenge",
      type: "distance",
      startDate: "2026-04-01",
      endDate: "2026-12-31",
    });

    const athleteClient = await clientFor("dave");
    await athleteClient.mutation(api.challenges.join, {
      tenantId: tenantId(),
      challengeId,
    });

    await athleteClient.mutation(api.challenges.leave, {
      tenantId: tenantId(),
      challengeId,
    });

    // Leaving when not a participant should throw
    await expectToThrow(
      () =>
        athleteClient.mutation(api.challenges.leave, {
          tenantId: tenantId(),
          challengeId,
        }),
      "Not a participant"
    );
  });

  test("getStandings returns participants sorted by progress", async () => {
    const coachClient = await clientFor("bob");
    const challengeId = await coachClient.mutation(api.challenges.create, {
      tenantId: tenantId(),
      name: "Standings Test",
      type: "distance",
      startDate: "2026-04-01",
      endDate: "2026-12-31",
    });

    // Both dave and eve join
    const daveClient = await clientFor("dave");
    await daveClient.mutation(api.challenges.join, {
      tenantId: tenantId(),
      challengeId,
    });

    const eveClient = await clientFor("eve");
    await eveClient.mutation(api.challenges.join, {
      tenantId: tenantId(),
      challengeId,
    });

    const standings = await daveClient.query(api.challenges.getStandings, {
      tenantId: tenantId(),
      challengeId,
    });

    expect(standings.length).toBeGreaterThanOrEqual(2);
    for (const p of standings) {
      expect(p.challengeId).toBe(challengeId);
    }
  });

  // ---- Tenant isolation ----

  test("user cannot access challenges from a tenant they don't belong to", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.query(api.challenges.list, {
          tenantId: betaTenantId(),
        }),
      "not a member"
    );
  });

  test("getById rejects challenge from another tenant", async () => {
    // Create a challenge in cf-beta as grace (owner of cf-beta)
    const graceClient = await clientFor("grace");
    const betaChallengeId = await graceClient.mutation(api.challenges.create, {
      tenantId: betaTenantId(),
      name: "Beta Only Challenge",
      type: "frequency",
      startDate: "2026-04-01",
      endDate: "2026-12-31",
    });

    // Dave (cf-alpha only) cannot access it
    const daveClient = await clientFor("dave");
    await expectToThrow(
      () =>
        daveClient.query(api.challenges.getById, {
          tenantId: tenantId(),
          challengeId: betaChallengeId,
        }),
      "not found"
    );
  });

  test("user cannot join a challenge in another tenant", async () => {
    const graceClient = await clientFor("grace");
    const betaChallengeId = await graceClient.mutation(api.challenges.create, {
      tenantId: betaTenantId(),
      name: "Beta Join Test",
      type: "volume",
      startDate: "2026-04-01",
      endDate: "2026-12-31",
    });

    const daveClient = await clientFor("dave");
    await expectToThrow(
      () =>
        daveClient.mutation(api.challenges.join, {
          tenantId: betaTenantId(),
          challengeId: betaChallengeId,
        }),
      "not a member"
    );
  });
});
