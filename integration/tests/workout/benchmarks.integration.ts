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
 * [FR-BM] Benchmark Workouts
 *
 * Tests benchmark workout CRUD, category filtering, platform vs tenant benchmarks,
 * auth enforcement, RBAC gating, and tenant isolation.
 */
describe("[FR-BM] Benchmark Workouts", () => {
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

  test("unauthenticated user cannot list benchmark workouts", async () => {
    await expectToThrow(
      () => unauthenticatedClient.query(api.benchmarkWorkouts.list, { tenantId: tenantId() }),
      "Not authenticated"
    );
  });

  test("unauthenticated user cannot create benchmark workouts", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.benchmarkWorkouts.create, {
          tenantId: tenantId(),
          name: "Hack Benchmark",
          workoutType: "ForTime",
          scoringMethod: "time",
        }),
      "Not authenticated"
    );
  });

  // --------------------------------------------------------------------------
  // RBAC enforcement — create/update requires coach+
  // --------------------------------------------------------------------------

  test("athlete cannot create benchmark workouts (coach+ required)", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.mutation(api.benchmarkWorkouts.create, {
          tenantId: tenantId(),
          name: "Athlete Benchmark",
          workoutType: "ForTime",
          scoringMethod: "time",
        }),
      "Insufficient role"
    );
  });

  test("coach can create a benchmark workout", async () => {
    const client = await clientFor("bob");

    const benchmarkId = await client.mutation(api.benchmarkWorkouts.create, {
      tenantId: tenantId(),
      name: "Coach Created Benchmark",
      description: "A test benchmark created by a coach.",
      workoutType: "AMRAP",
      scoringMethod: "rounds_reps",
      category: "custom",
      timeCap: 1200,
      prescribedMovements: [
        { exerciseName: "Wall Ball", reps: 20, weight: { value: 20, unit: "lbs" } },
        { exerciseName: "Box Jump", reps: 20 },
        { exerciseName: "Row", calories: 20 },
      ],
      intendedStimulus: "High-intensity, keep moving for 20 minutes.",
    });

    expectValidId(benchmarkId);
  });

  // --------------------------------------------------------------------------
  // CRUD happy path
  // --------------------------------------------------------------------------

  test("coach can create, read, update a benchmark workout", async () => {
    const client = await clientFor("bob");

    // Create
    const benchmarkId = await client.mutation(api.benchmarkWorkouts.create, {
      tenantId: tenantId(),
      name: "CRUD Benchmark Test",
      description: "For CRUD testing",
      workoutType: "ForTime",
      scoringMethod: "time",
      category: "Girl",
      prescribedMovements: [
        { exerciseName: "Clean & Jerk", reps: 30, weight: { value: 135, unit: "lbs" } },
      ],
      timeCap: 600,
    });
    expectValidId(benchmarkId);

    // Read
    const benchmark = await client.query(api.benchmarkWorkouts.getById, {
      tenantId: tenantId(),
      benchmarkId: benchmarkId as Id<"benchmark_workouts">,
    });
    expect(benchmark.name).toBe("CRUD Benchmark Test");
    expect(benchmark.workoutType).toBe("ForTime");
    expect(benchmark.scoringMethod).toBe("time");
    expect(benchmark.category).toBe("Girl");
    expect(benchmark.prescribedMovements).toHaveLength(1);
    expect(benchmark.prescribedMovements[0].exerciseName).toBe("Clean & Jerk");

    // Update
    await client.mutation(api.benchmarkWorkouts.update, {
      tenantId: tenantId(),
      benchmarkId: benchmarkId as Id<"benchmark_workouts">,
      name: "CRUD Benchmark Updated",
      description: "Updated description",
      timeCap: 900,
    });

    const updated = await client.query(api.benchmarkWorkouts.getById, {
      tenantId: tenantId(),
      benchmarkId: benchmarkId as Id<"benchmark_workouts">,
    });
    expect(updated.name).toBe("CRUD Benchmark Updated");
    expect(updated.description).toBe("Updated description");
    expect(updated.timeCap).toBe(900);
  });

  // --------------------------------------------------------------------------
  // List and category filtering
  // --------------------------------------------------------------------------

  test("athlete can list benchmark workouts", async () => {
    const client = await clientFor("dave");

    const benchmarks = await client.query(api.benchmarkWorkouts.list, {
      tenantId: tenantId(),
    });

    expect(benchmarks.length).toBeGreaterThan(0);
  });

  test("list benchmarks can filter by category", async () => {
    const client = await clientFor("bob");

    // Create benchmarks in different categories
    await client.mutation(api.benchmarkWorkouts.create, {
      tenantId: tenantId(),
      name: "Hero Category Test",
      workoutType: "ForTime",
      scoringMethod: "time",
      category: "Hero",
    });

    await client.mutation(api.benchmarkWorkouts.create, {
      tenantId: tenantId(),
      name: "Open Category Test",
      workoutType: "AMRAP",
      scoringMethod: "rounds_reps",
      category: "Open",
    });

    const heroes = await client.query(api.benchmarkWorkouts.list, {
      tenantId: tenantId(),
      category: "Hero",
    });

    for (const b of heroes) {
      expect(b.category).toBe("Hero");
    }

    const opens = await client.query(api.benchmarkWorkouts.list, {
      tenantId: tenantId(),
      category: "Open",
    });

    for (const b of opens) {
      expect(b.category).toBe("Open");
    }
  });

  // --------------------------------------------------------------------------
  // Platform benchmarks are visible but not modifiable
  // --------------------------------------------------------------------------

  test("cannot modify platform benchmark workouts", async () => {
    const client = await clientFor("bob");

    const allBenchmarks = await client.query(api.benchmarkWorkouts.list, {
      tenantId: tenantId(),
    });

    const platformBenchmark = allBenchmarks.find((b) => b.tenantId === undefined);
    if (platformBenchmark) {
      await expectToThrow(
        () =>
          client.mutation(api.benchmarkWorkouts.update, {
            tenantId: tenantId(),
            benchmarkId: platformBenchmark._id,
            name: "Hacked Platform Benchmark",
          }),
        "Cannot modify platform benchmark workouts"
      );
    }
  });

  // --------------------------------------------------------------------------
  // RBAC enforcement — update requires coach+
  // --------------------------------------------------------------------------

  test("athlete cannot update benchmark workouts (coach+ required)", async () => {
    const coachClient = await clientFor("bob");

    const benchmarkId = await coachClient.mutation(api.benchmarkWorkouts.create, {
      tenantId: tenantId(),
      name: "Athlete Update Benchmark Target",
      workoutType: "Strength",
      scoringMethod: "weight",
    });

    const athleteClient = await clientFor("dave");

    await expectToThrow(
      () =>
        athleteClient.mutation(api.benchmarkWorkouts.update, {
          tenantId: tenantId(),
          benchmarkId: benchmarkId as Id<"benchmark_workouts">,
          name: "Hacked by Athlete",
        }),
      "Insufficient role"
    );
  });

  // --------------------------------------------------------------------------
  // Tenant isolation
  // --------------------------------------------------------------------------

  test("user cannot access benchmarks from another tenant via getById", async () => {
    const graceClient = await clientFor("grace");

    const betaBenchmarkId = await graceClient.mutation(api.benchmarkWorkouts.create, {
      tenantId: betaTenantId(),
      name: "Beta Only Benchmark",
      workoutType: "ForTime",
      scoringMethod: "time",
      category: "custom",
    });

    const daveClient = await clientFor("dave");

    await expectToThrow(
      () =>
        daveClient.query(api.benchmarkWorkouts.getById, {
          tenantId: tenantId(),
          benchmarkId: betaBenchmarkId as Id<"benchmark_workouts">,
        }),
      "Benchmark workout not found"
    );
  });

  test("tenant-scoped benchmark list does not include other tenant's benchmarks", async () => {
    const graceClient = await clientFor("grace");

    await graceClient.mutation(api.benchmarkWorkouts.create, {
      tenantId: betaTenantId(),
      name: "IsolationBenchmarkBetaOnly",
      workoutType: "AMRAP",
      scoringMethod: "reps",
    });

    const daveClient = await clientFor("dave");
    const alphaBenchmarks = await daveClient.query(api.benchmarkWorkouts.list, {
      tenantId: tenantId(),
    });

    const names = alphaBenchmarks.map((b) => b.name);
    expect(names).not.toContain("IsolationBenchmarkBetaOnly");
  });

  test("coach in tenant A cannot update benchmark in tenant B", async () => {
    const graceClient = await clientFor("grace");

    const betaBenchmarkId = await graceClient.mutation(api.benchmarkWorkouts.create, {
      tenantId: betaTenantId(),
      name: "Cross Tenant Benchmark Target",
      workoutType: "ForTime",
      scoringMethod: "time",
    });

    const bobClient = await clientFor("bob");

    await expectToThrow(
      () =>
        bobClient.mutation(api.benchmarkWorkouts.update, {
          tenantId: tenantId(),
          benchmarkId: betaBenchmarkId as Id<"benchmark_workouts">,
          name: "Hacked Cross Tenant",
        }),
      "Benchmark workout not found"
    );
  });

  // --------------------------------------------------------------------------
  // Scoring method validation
  // --------------------------------------------------------------------------

  test("benchmark supports all scoring methods", async () => {
    const client = await clientFor("bob");

    const scoringMethods = ["time", "reps", "rounds_reps", "weight", "distance", "calories"] as const;

    for (const method of scoringMethods) {
      const benchmarkId = await client.mutation(api.benchmarkWorkouts.create, {
        tenantId: tenantId(),
        name: `Scoring ${method} Test`,
        workoutType: "Custom",
        scoringMethod: method,
      });
      expectValidId(benchmarkId);
    }
  });
});
