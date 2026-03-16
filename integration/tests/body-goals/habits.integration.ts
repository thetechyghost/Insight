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
 * [FR-NW] Habits
 *
 * Tests habit tracking CRUD and completion logging:
 * - Create, list, log completion, remove
 * - Idempotent completion logging (duplicate date ignored)
 * - Auth enforcement
 * - Ownership enforcement (can only modify own habits)
 * - Tenant isolation
 */
describe("[FR-NW] Habits", () => {
  let ctx: SeedContext;
  let unauthenticatedClient: ConvexHttpClient;

  let daveHabitId: Id<"habits">;

  beforeAll(() => {
    ctx = loadSeedContext();
    unauthenticatedClient = createTestClient();
  });

  async function clientFor(userKey: string) {
    const token = await getAuthToken(ctx.users[userKey].email!);
    return createAuthenticatedClient(token);
  }

  const tenantId = () => ctx.tenants.cfAlpha.id as Id<"tenants">;

  // --------------------------------------------------------------------------
  // Auth enforcement
  // --------------------------------------------------------------------------

  test("unauthenticated user cannot list habits", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.query(api.habits.listMine, {
          tenantId: tenantId(),
        }),
      "Not authenticated"
    );
  });

  test("unauthenticated user cannot create a habit", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.habits.create, {
          tenantId: tenantId(),
          name: "Hacked Habit",
          frequency: "daily",
        }),
      "Not authenticated"
    );
  });

  // --------------------------------------------------------------------------
  // CRUD happy path
  // --------------------------------------------------------------------------

  test("athlete can create a daily habit", async () => {
    const client = await clientFor("dave");

    daveHabitId = await client.mutation(api.habits.create, {
      tenantId: tenantId(),
      name: "Drink 3L water",
      frequency: "daily",
    });

    expectValidId(daveHabitId);
  });

  test("athlete can create a weekly habit", async () => {
    const client = await clientFor("dave");

    const weeklyId = await client.mutation(api.habits.create, {
      tenantId: tenantId(),
      name: "Mobility session",
      frequency: "weekly",
    });

    expectValidId(weeklyId);

    // Clean up the weekly habit
    await client.mutation(api.habits.remove, {
      tenantId: tenantId(),
      habitId: weeklyId,
    });
  });

  test("athlete can list their habits", async () => {
    const client = await clientFor("dave");

    const habits = await client.query(api.habits.listMine, {
      tenantId: tenantId(),
    });

    expect(habits.length).toBeGreaterThan(0);
    const target = habits.find((h: any) => h._id === daveHabitId);
    expect(target).toBeDefined();
    expect(target!.name).toBe("Drink 3L water");
    expect(target!.frequency).toBe("daily");
    expect(target!.trackingRecords).toEqual([]);
  });

  // --------------------------------------------------------------------------
  // Completion logging
  // --------------------------------------------------------------------------

  test("athlete can log a habit completion", async () => {
    const client = await clientFor("dave");

    await client.mutation(api.habits.logCompletion, {
      tenantId: tenantId(),
      habitId: daveHabitId,
      date: "2026-03-15",
    });

    const habits = await client.query(api.habits.listMine, {
      tenantId: tenantId(),
    });
    const target = habits.find((h: any) => h._id === daveHabitId);
    expect(target!.trackingRecords).toContain("2026-03-15");
  });

  test("logging completion for the same date is idempotent", async () => {
    const client = await clientFor("dave");

    await client.mutation(api.habits.logCompletion, {
      tenantId: tenantId(),
      habitId: daveHabitId,
      date: "2026-03-15",
    });

    const habits = await client.query(api.habits.listMine, {
      tenantId: tenantId(),
    });
    const target = habits.find((h: any) => h._id === daveHabitId);
    // Should still only have one entry for 2026-03-15
    const matchingDates = target!.trackingRecords!.filter(
      (d: string) => d === "2026-03-15"
    );
    expect(matchingDates.length).toBe(1);
  });

  test("athlete can log multiple dates", async () => {
    const client = await clientFor("dave");

    await client.mutation(api.habits.logCompletion, {
      tenantId: tenantId(),
      habitId: daveHabitId,
      date: "2026-03-16",
    });

    await client.mutation(api.habits.logCompletion, {
      tenantId: tenantId(),
      habitId: daveHabitId,
      date: "2026-03-17",
    });

    const habits = await client.query(api.habits.listMine, {
      tenantId: tenantId(),
    });
    const target = habits.find((h: any) => h._id === daveHabitId);
    expect(target!.trackingRecords!.length).toBeGreaterThanOrEqual(3);
    expect(target!.trackingRecords).toContain("2026-03-15");
    expect(target!.trackingRecords).toContain("2026-03-16");
    expect(target!.trackingRecords).toContain("2026-03-17");
  });

  // --------------------------------------------------------------------------
  // Ownership enforcement
  // --------------------------------------------------------------------------

  test("another user cannot log completion on someone else's habit", async () => {
    const client = await clientFor("eve");

    await expectToThrow(
      () =>
        client.mutation(api.habits.logCompletion, {
          tenantId: tenantId(),
          habitId: daveHabitId,
          date: "2026-03-15",
        }),
      "Habit not found"
    );
  });

  test("another user cannot delete someone else's habit", async () => {
    const client = await clientFor("eve");

    await expectToThrow(
      () =>
        client.mutation(api.habits.remove, {
          tenantId: tenantId(),
          habitId: daveHabitId,
        }),
      "Habit not found"
    );
  });

  test("eve sees only her own habits (empty initially)", async () => {
    const client = await clientFor("eve");

    const habits = await client.query(api.habits.listMine, {
      tenantId: tenantId(),
    });

    const daveHabit = habits.find((h: any) => h._id === daveHabitId);
    expect(daveHabit).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // Tenant isolation
  // --------------------------------------------------------------------------

  test("grace (cf-beta) cannot create habits in cf-alpha", async () => {
    const client = await clientFor("grace");

    await expectToThrow(
      () =>
        client.mutation(api.habits.create, {
          tenantId: tenantId(),
          name: "Cross-tenant Habit",
          frequency: "daily",
        }),
      "not a member"
    );
  });

  test("grace (cf-beta) cannot list habits in cf-alpha", async () => {
    const client = await clientFor("grace");

    await expectToThrow(
      () => client.query(api.habits.listMine, { tenantId: tenantId() }),
      "not a member"
    );
  });

  // --------------------------------------------------------------------------
  // Cleanup
  // --------------------------------------------------------------------------

  test("cleanup: athlete removes own habit", async () => {
    const client = await clientFor("dave");

    await client.mutation(api.habits.remove, {
      tenantId: tenantId(),
      habitId: daveHabitId,
    });

    const habits = await client.query(api.habits.listMine, {
      tenantId: tenantId(),
    });
    const found = habits.find((h: any) => h._id === daveHabitId);
    expect(found).toBeUndefined();
  });
});
