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
 * [FR-UA] Workout Logging
 *
 * Tests workout log creation, drafts, finalization, date filtering,
 * previous scores, auth enforcement, ownership enforcement, and tenant isolation.
 */
describe("[FR-UA] Workout Logging", () => {
  let ctx: SeedContext;
  let unauthenticatedClient: ConvexHttpClient;

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

  // --------------------------------------------------------------------------
  // Auth enforcement
  // --------------------------------------------------------------------------

  test("unauthenticated user cannot create a workout log", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.workoutLogs.create, {
          tenantId: tenantId(),
          date: "2026-03-15",
          workoutType: "ForTime",
          isDraft: false,
        }),
      "Not authenticated"
    );
  });

  test("unauthenticated user cannot list workout logs", async () => {
    await expectToThrow(
      () => unauthenticatedClient.query(api.workoutLogs.listMine, { tenantId: tenantId() }),
      "Not authenticated"
    );
  });

  // --------------------------------------------------------------------------
  // CRUD happy path — any authenticated user can log workouts
  // --------------------------------------------------------------------------

  test("athlete can create a workout log", async () => {
    const client = await clientFor("dave");

    const logId = await client.mutation(api.workoutLogs.create, {
      tenantId: tenantId(),
      date: "2026-03-15",
      workoutType: "ForTime",
      scalingDesignation: "Rx",
      rpe: 8,
      notes: "Felt good, maintained pace.",
      isDraft: false,
    });

    expectValidId(logId);
  });

  test("athlete can read their own workout log by ID", async () => {
    const client = await clientFor("dave");

    const logId = await client.mutation(api.workoutLogs.create, {
      tenantId: tenantId(),
      date: "2026-03-14",
      workoutType: "AMRAP",
      rpe: 7,
      isDraft: false,
    });

    const log = await client.query(api.workoutLogs.getById, {
      tenantId: tenantId(),
      logId: logId as Id<"workout_logs">,
    });

    expect(log.date).toBe("2026-03-14");
    expect(log.workoutType).toBe("AMRAP");
    expect(log.rpe).toBe(7);
    expect(log.isDraft).toBe(false);
  });

  test("athlete can update their own workout log", async () => {
    const client = await clientFor("dave");

    const logId = await client.mutation(api.workoutLogs.create, {
      tenantId: tenantId(),
      date: "2026-03-13",
      workoutType: "Strength",
      isDraft: false,
    });

    await client.mutation(api.workoutLogs.update, {
      tenantId: tenantId(),
      logId: logId as Id<"workout_logs">,
      rpe: 9,
      notes: "Updated notes after reflection.",
    });

    const updated = await client.query(api.workoutLogs.getById, {
      tenantId: tenantId(),
      logId: logId as Id<"workout_logs">,
    });

    expect(updated.rpe).toBe(9);
    expect(updated.notes).toBe("Updated notes after reflection.");
  });

  test("athlete can delete their own workout log", async () => {
    const client = await clientFor("dave");

    const logId = await client.mutation(api.workoutLogs.create, {
      tenantId: tenantId(),
      date: "2026-03-12",
      workoutType: "Custom",
      isDraft: false,
    });

    await client.mutation(api.workoutLogs.remove, {
      tenantId: tenantId(),
      logId: logId as Id<"workout_logs">,
    });

    await expectToThrow(
      () =>
        client.query(api.workoutLogs.getById, {
          tenantId: tenantId(),
          logId: logId as Id<"workout_logs">,
        }),
      "Workout log not found"
    );
  });

  // --------------------------------------------------------------------------
  // Draft workflow
  // --------------------------------------------------------------------------

  test("athlete can save a draft and then finalize it", async () => {
    const client = await clientFor("dave");

    // Save initial draft
    const draftId = await client.mutation(api.workoutLogs.saveDraft, {
      tenantId: tenantId(),
      date: "2026-03-10",
      workoutType: "EMOM",
      notes: "Initial draft",
    });
    expectValidId(draftId);

    // Verify it appears in drafts
    const drafts = await client.query(api.workoutLogs.getDrafts, {
      tenantId: tenantId(),
    });
    const myDraft = drafts.find((d) => d._id === draftId);
    expect(myDraft).toBeDefined();
    expect(myDraft!.isDraft).toBe(true);

    // Update the draft
    await client.mutation(api.workoutLogs.saveDraft, {
      tenantId: tenantId(),
      logId: draftId as Id<"workout_logs">,
      date: "2026-03-10",
      workoutType: "EMOM",
      rpe: 6,
      notes: "Updated draft with RPE",
    });

    // Finalize
    await client.mutation(api.workoutLogs.finalize, {
      tenantId: tenantId(),
      logId: draftId as Id<"workout_logs">,
    });

    // Verify no longer a draft
    const finalized = await client.query(api.workoutLogs.getById, {
      tenantId: tenantId(),
      logId: draftId as Id<"workout_logs">,
    });
    expect(finalized.isDraft).toBe(false);
    expect(finalized.rpe).toBe(6);
  });

  // --------------------------------------------------------------------------
  // Date-based queries
  // --------------------------------------------------------------------------

  test("listMine returns logs filtered by date range", async () => {
    const client = await clientFor("eve");

    // Create logs on different dates
    await client.mutation(api.workoutLogs.create, {
      tenantId: tenantId(),
      date: "2026-02-01",
      workoutType: "ForTime",
      isDraft: false,
    });

    await client.mutation(api.workoutLogs.create, {
      tenantId: tenantId(),
      date: "2026-02-15",
      workoutType: "AMRAP",
      isDraft: false,
    });

    await client.mutation(api.workoutLogs.create, {
      tenantId: tenantId(),
      date: "2026-03-01",
      workoutType: "Strength",
      isDraft: false,
    });

    // Query February only
    const febLogs = await client.query(api.workoutLogs.listMine, {
      tenantId: tenantId(),
      startDate: "2026-02-01",
      endDate: "2026-02-28",
    });

    for (const log of febLogs) {
      expect(log.date >= "2026-02-01").toBe(true);
      expect(log.date <= "2026-02-28").toBe(true);
    }
  });

  test("getByDate returns logs for a specific date", async () => {
    const client = await clientFor("eve");
    const targetDate = "2026-04-01";

    await client.mutation(api.workoutLogs.create, {
      tenantId: tenantId(),
      date: targetDate,
      workoutType: "Tabata",
      isDraft: false,
    });

    const logs = await client.query(api.workoutLogs.getByDate, {
      tenantId: tenantId(),
      date: targetDate,
    });

    expect(logs.length).toBeGreaterThanOrEqual(1);
    for (const log of logs) {
      expect(log.date).toBe(targetDate);
    }
  });

  // --------------------------------------------------------------------------
  // Idempotency
  // --------------------------------------------------------------------------

  test("duplicate create with same idempotencyKey returns same ID", async () => {
    const client = await clientFor("dave");
    const key = `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const firstId = await client.mutation(api.workoutLogs.create, {
      tenantId: tenantId(),
      date: "2026-03-15",
      workoutType: "ForTime",
      isDraft: false,
      idempotencyKey: key,
    });

    const secondId = await client.mutation(api.workoutLogs.create, {
      tenantId: tenantId(),
      date: "2026-03-15",
      workoutType: "ForTime",
      isDraft: false,
      idempotencyKey: key,
    });

    expect(firstId).toBe(secondId);
  });

  // --------------------------------------------------------------------------
  // Previous scores
  // --------------------------------------------------------------------------

  test("getPreviousScores returns empty array when no previous logs exist", async () => {
    const client = await clientFor("eve");

    const scores = await client.query(api.workoutLogs.getPreviousScores, {
      tenantId: tenantId(),
    });

    expect(scores).toEqual([]);
  });

  // --------------------------------------------------------------------------
  // listByUser — coach+ can view other users' logs
  // --------------------------------------------------------------------------

  test("coach can list another user's workout logs", async () => {
    const client = await clientFor("bob");

    const logs = await client.query(api.workoutLogs.listByUser, {
      tenantId: tenantId(),
      userId: ctx.users.dave.id as Id<"users">,
    });

    // Dave has created logs above, so this should have results
    expect(logs.length).toBeGreaterThan(0);
  });

  test("athlete cannot list another user's workout logs (coach+ required)", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.query(api.workoutLogs.listByUser, {
          tenantId: tenantId(),
          userId: ctx.users.eve.id as Id<"users">,
        }),
      "Insufficient role"
    );
  });

  // --------------------------------------------------------------------------
  // Ownership enforcement
  // --------------------------------------------------------------------------

  test("user cannot update another user's workout log", async () => {
    // Dave creates a log
    const daveClient = await clientFor("dave");
    const logId = await daveClient.mutation(api.workoutLogs.create, {
      tenantId: tenantId(),
      date: "2026-03-11",
      workoutType: "ForTime",
      isDraft: false,
    });

    // Eve tries to update Dave's log
    const eveClient = await clientFor("eve");
    await expectToThrow(
      () =>
        eveClient.mutation(api.workoutLogs.update, {
          tenantId: tenantId(),
          logId: logId as Id<"workout_logs">,
          notes: "Eve hacked this",
        }),
      "Workout log not found"
    );
  });

  test("user cannot delete another user's workout log", async () => {
    const daveClient = await clientFor("dave");
    const logId = await daveClient.mutation(api.workoutLogs.create, {
      tenantId: tenantId(),
      date: "2026-03-09",
      workoutType: "Strength",
      isDraft: false,
    });

    const eveClient = await clientFor("eve");
    await expectToThrow(
      () =>
        eveClient.mutation(api.workoutLogs.remove, {
          tenantId: tenantId(),
          logId: logId as Id<"workout_logs">,
        }),
      "Workout log not found"
    );
  });

  test("user cannot finalize another user's draft", async () => {
    const daveClient = await clientFor("dave");
    const draftId = await daveClient.mutation(api.workoutLogs.saveDraft, {
      tenantId: tenantId(),
      date: "2026-03-08",
      workoutType: "AMRAP",
    });

    const eveClient = await clientFor("eve");
    await expectToThrow(
      () =>
        eveClient.mutation(api.workoutLogs.finalize, {
          tenantId: tenantId(),
          logId: draftId as Id<"workout_logs">,
        }),
      "Workout log not found"
    );
  });

  // --------------------------------------------------------------------------
  // Tenant isolation
  // --------------------------------------------------------------------------

  test("user cannot access workout logs from another tenant", async () => {
    // Grace creates a log in cfBeta
    const graceClient = await clientFor("grace");
    const betaLogId = await graceClient.mutation(api.workoutLogs.create, {
      tenantId: betaTenantId(),
      date: "2026-03-15",
      workoutType: "ForTime",
      isDraft: false,
    });

    // Dave (cfAlpha) tries to read Grace's cfBeta log
    const daveClient = await clientFor("dave");
    await expectToThrow(
      () =>
        daveClient.query(api.workoutLogs.getById, {
          tenantId: tenantId(),
          logId: betaLogId as Id<"workout_logs">,
        }),
      "does not belong to this tenant"
    );
  });

  test("listMine only returns logs for the requested tenant", async () => {
    // Frank is in both cfAlpha and cfBeta
    const frankClient = await clientFor("frank");

    // Create a log in cfAlpha
    await frankClient.mutation(api.workoutLogs.create, {
      tenantId: tenantId(),
      date: "2026-03-05",
      workoutType: "AMRAP",
      isDraft: false,
      notes: "Alpha log",
    });

    // Create a log in cfBeta
    await frankClient.mutation(api.workoutLogs.create, {
      tenantId: betaTenantId(),
      date: "2026-03-05",
      workoutType: "Strength",
      isDraft: false,
      notes: "Beta log",
    });

    // List from cfAlpha — should only include alpha logs
    const alphaLogs = await frankClient.query(api.workoutLogs.listMine, {
      tenantId: tenantId(),
    });
    for (const log of alphaLogs) {
      expect(log.tenantId).toBe(ctx.tenants.cfAlpha.id);
    }

    // List from cfBeta — should only include beta logs
    const betaLogs = await frankClient.query(api.workoutLogs.listMine, {
      tenantId: betaTenantId(),
    });
    for (const log of betaLogs) {
      expect(log.tenantId).toBe(ctx.tenants.cfBeta.id);
    }
  });
});
