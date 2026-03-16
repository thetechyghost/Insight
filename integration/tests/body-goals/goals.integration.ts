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
 * [FR-UA] Goals
 *
 * Tests the goal CRUD and lifecycle:
 * - Create, list, get by ID, update, mark complete, abandon
 * - Filter by status
 * - Auth enforcement
 * - Ownership enforcement (can only modify own goals)
 * - Tenant isolation
 */
describe("[FR-UA] Goals", () => {
  let ctx: SeedContext;
  let unauthenticatedClient: ConvexHttpClient;

  let daveGoalId: Id<"goals">;
  let daveSecondGoalId: Id<"goals">;

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

  test("unauthenticated user cannot list goals", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.query(api.goals.listMine, {
          tenantId: tenantId(),
        }),
      "Not authenticated"
    );
  });

  test("unauthenticated user cannot create a goal", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.goals.create, {
          tenantId: tenantId(),
          type: "strength",
          title: "Hacked Goal",
        }),
      "Not authenticated"
    );
  });

  // --------------------------------------------------------------------------
  // CRUD happy path
  // --------------------------------------------------------------------------

  test("athlete can create a strength goal", async () => {
    const client = await clientFor("dave");

    daveGoalId = await client.mutation(api.goals.create, {
      tenantId: tenantId(),
      type: "strength",
      title: "Back Squat 200kg",
      description: "Hit a 200kg back squat by end of year",
      targetValue: 200,
      currentValue: 160,
      unit: "kg",
      deadline: "2026-12-31",
    });

    expectValidId(daveGoalId);
  });

  test("athlete can create a second goal (body comp)", async () => {
    const client = await clientFor("dave");

    daveSecondGoalId = await client.mutation(api.goals.create, {
      tenantId: tenantId(),
      type: "body_comp",
      title: "Reach 80kg bodyweight",
      targetValue: 80,
      currentValue: 85,
      unit: "kg",
    });

    expectValidId(daveSecondGoalId);
  });

  test("athlete can list all their goals", async () => {
    const client = await clientFor("dave");

    const goals = await client.query(api.goals.listMine, {
      tenantId: tenantId(),
    });

    expect(goals.length).toBeGreaterThanOrEqual(2);
    const titles = goals.map((g: any) => g.title);
    expect(titles).toContain("Back Squat 200kg");
    expect(titles).toContain("Reach 80kg bodyweight");
  });

  test("athlete can filter goals by status", async () => {
    const client = await clientFor("dave");

    const activeGoals = await client.query(api.goals.listMine, {
      tenantId: tenantId(),
      status: "active",
    });

    expect(activeGoals.length).toBeGreaterThanOrEqual(2);
    for (const g of activeGoals) {
      expect(g.status).toBe("active");
    }
  });

  test("athlete can get a goal by ID", async () => {
    const client = await clientFor("dave");

    const goal = await client.query(api.goals.getById, {
      tenantId: tenantId(),
      goalId: daveGoalId,
    });

    expect(goal.title).toBe("Back Squat 200kg");
    expect(goal.type).toBe("strength");
    expect(goal.targetValue).toBe(200);
    expect(goal.status).toBe("active");
  });

  test("athlete can update a goal", async () => {
    const client = await clientFor("dave");

    await client.mutation(api.goals.update, {
      tenantId: tenantId(),
      goalId: daveGoalId,
      currentValue: 170,
      description: "Making progress, hit 170kg last week",
    });

    const goal = await client.query(api.goals.getById, {
      tenantId: tenantId(),
      goalId: daveGoalId,
    });

    expect(goal.currentValue).toBe(170);
    expect(goal.description).toBe("Making progress, hit 170kg last week");
    // Unchanged fields remain
    expect(goal.targetValue).toBe(200);
  });

  test("athlete can mark a goal as complete", async () => {
    const client = await clientFor("dave");

    await client.mutation(api.goals.markComplete, {
      tenantId: tenantId(),
      goalId: daveSecondGoalId,
    });

    const goal = await client.query(api.goals.getById, {
      tenantId: tenantId(),
      goalId: daveSecondGoalId,
    });

    expect(goal.status).toBe("completed");
    expect(goal.completedAt).toBeDefined();
  });

  test("completed goals appear in completed filter", async () => {
    const client = await clientFor("dave");

    const completedGoals = await client.query(api.goals.listMine, {
      tenantId: tenantId(),
      status: "completed",
    });

    const found = completedGoals.find((g: any) => g._id === daveSecondGoalId);
    expect(found).toBeDefined();
  });

  test("athlete can abandon a goal", async () => {
    const client = await clientFor("dave");

    await client.mutation(api.goals.abandon, {
      tenantId: tenantId(),
      goalId: daveGoalId,
    });

    const goal = await client.query(api.goals.getById, {
      tenantId: tenantId(),
      goalId: daveGoalId,
    });

    expect(goal.status).toBe("abandoned");
  });

  // --------------------------------------------------------------------------
  // Ownership enforcement
  // --------------------------------------------------------------------------

  test("another user cannot view someone else's goal", async () => {
    const client = await clientFor("eve");

    await expectToThrow(
      () =>
        client.query(api.goals.getById, {
          tenantId: tenantId(),
          goalId: daveGoalId,
        }),
      "Goal not found"
    );
  });

  test("another user cannot update someone else's goal", async () => {
    const client = await clientFor("eve");

    await expectToThrow(
      () =>
        client.mutation(api.goals.update, {
          tenantId: tenantId(),
          goalId: daveGoalId,
          title: "Stolen Goal",
        }),
      "Goal not found"
    );
  });

  test("another user cannot mark complete someone else's goal", async () => {
    const client = await clientFor("eve");

    await expectToThrow(
      () =>
        client.mutation(api.goals.markComplete, {
          tenantId: tenantId(),
          goalId: daveSecondGoalId,
        }),
      "Goal not found"
    );
  });

  test("eve sees only her own goals (empty initially)", async () => {
    const client = await clientFor("eve");

    const goals = await client.query(api.goals.listMine, {
      tenantId: tenantId(),
    });

    const daveGoals = goals.filter(
      (g: any) => g._id === daveGoalId || g._id === daveSecondGoalId
    );
    expect(daveGoals.length).toBe(0);
  });

  // --------------------------------------------------------------------------
  // Tenant isolation
  // --------------------------------------------------------------------------

  test("grace (cf-beta) cannot create goals in cf-alpha", async () => {
    const client = await clientFor("grace");

    await expectToThrow(
      () =>
        client.mutation(api.goals.create, {
          tenantId: tenantId(),
          type: "strength",
          title: "Cross-tenant Goal",
        }),
      "not a member"
    );
  });

  test("grace (cf-beta) cannot list goals in cf-alpha", async () => {
    const client = await clientFor("grace");

    await expectToThrow(
      () => client.query(api.goals.listMine, { tenantId: tenantId() }),
      "not a member"
    );
  });
});
