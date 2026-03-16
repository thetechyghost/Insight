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
 * [FR-EL] Exercise Library
 *
 * Tests the exercise CRUD operations, search, category filtering,
 * auth enforcement, RBAC gating, and tenant isolation.
 */
describe("[FR-EL] Exercise Library", () => {
  let ctx: SeedContext;
  let unauthenticatedClient: ConvexHttpClient;

  beforeAll(() => {
    ctx = loadSeedContext();
    unauthenticatedClient = createTestClient();
  });

  // Helper to get an authenticated client for a user
  async function clientFor(userKey: string) {
    const token = await getAuthToken(ctx.users[userKey].email!);
    return createAuthenticatedClient(token);
  }

  const tenantId = () => ctx.tenants.cfAlpha.id as Id<"tenants">;
  const betaTenantId = () => ctx.tenants.cfBeta.id as Id<"tenants">;

  // --------------------------------------------------------------------------
  // Auth enforcement
  // --------------------------------------------------------------------------

  test("unauthenticated user cannot list exercises", async () => {
    await expectToThrow(
      () => unauthenticatedClient.query(api.exercises.list, { tenantId: tenantId() }),
      "Not authenticated"
    );
  });

  test("unauthenticated user cannot create exercises", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.exercises.create, {
          tenantId: tenantId(),
          name: "Hack Exercise",
          category: "weightlifting",
        }),
      "Not authenticated"
    );
  });

  // --------------------------------------------------------------------------
  // RBAC enforcement — create requires coach+
  // --------------------------------------------------------------------------

  test("athlete cannot create exercises (coach+ required)", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.mutation(api.exercises.create, {
          tenantId: tenantId(),
          name: "Athlete Exercise",
          category: "weightlifting",
        }),
      "Insufficient role"
    );
  });

  test("coach can create an exercise", async () => {
    const client = await clientFor("bob");

    const exerciseId = await client.mutation(api.exercises.create, {
      tenantId: tenantId(),
      name: "Test Deadlift",
      category: "weightlifting",
      equipment: ["barbell"],
      muscleGroups: ["hamstrings", "glutes", "back"],
      instructions: "Lift the barbell from the floor to hip level.",
      difficultyLevel: "intermediate",
    });

    expectValidId(exerciseId);
  });

  test("admin can create an exercise", async () => {
    const client = await clientFor("carol");

    const exerciseId = await client.mutation(api.exercises.create, {
      tenantId: tenantId(),
      name: "Test Bench Press",
      category: "weightlifting",
    });

    expectValidId(exerciseId);
  });

  test("owner can create an exercise", async () => {
    const client = await clientFor("alice");

    const exerciseId = await client.mutation(api.exercises.create, {
      tenantId: tenantId(),
      name: "Test Snatch",
      category: "weightlifting",
    });

    expectValidId(exerciseId);
  });

  // --------------------------------------------------------------------------
  // CRUD happy path
  // --------------------------------------------------------------------------

  test("coach can create, read, update, and delete an exercise", async () => {
    const client = await clientFor("bob");

    // Create
    const exerciseId = await client.mutation(api.exercises.create, {
      tenantId: tenantId(),
      name: "CRUD Test Exercise",
      category: "gymnastics",
      equipment: ["rings"],
      muscleGroups: ["chest", "triceps"],
      aliases: ["Ring Dip Test"],
      instructions: "Dip on rings to full lockout.",
      difficultyLevel: "advanced",
    });
    expectValidId(exerciseId);

    // Read
    const exercise = await client.query(api.exercises.getById, {
      tenantId: tenantId(),
      exerciseId: exerciseId as Id<"exercises">,
    });
    expect(exercise.name).toBe("CRUD Test Exercise");
    expect(exercise.category).toBe("gymnastics");
    expect(exercise.equipment).toEqual(["rings"]);
    expect(exercise.aliases).toEqual(["Ring Dip Test"]);
    expect(exercise.difficultyLevel).toBe("advanced");

    // Update
    await client.mutation(api.exercises.update, {
      tenantId: tenantId(),
      exerciseId: exerciseId as Id<"exercises">,
      name: "CRUD Test Exercise Updated",
      difficultyLevel: "intermediate",
    });

    const updated = await client.query(api.exercises.getById, {
      tenantId: tenantId(),
      exerciseId: exerciseId as Id<"exercises">,
    });
    expect(updated.name).toBe("CRUD Test Exercise Updated");
    expect(updated.difficultyLevel).toBe("intermediate");

    // Delete
    await client.mutation(api.exercises.remove, {
      tenantId: tenantId(),
      exerciseId: exerciseId as Id<"exercises">,
    });

    // Verify deletion
    await expectToThrow(
      () =>
        client.query(api.exercises.getById, {
          tenantId: tenantId(),
          exerciseId: exerciseId as Id<"exercises">,
        }),
      "Exercise not found"
    );
  });

  // --------------------------------------------------------------------------
  // List and filter by category
  // --------------------------------------------------------------------------

  test("athlete can list exercises for their tenant", async () => {
    const client = await clientFor("dave");

    const exercises = await client.query(api.exercises.list, {
      tenantId: tenantId(),
    });

    expect(exercises.length).toBeGreaterThan(0);
  });

  test("list exercises can filter by category", async () => {
    const client = await clientFor("bob");

    // Create exercises in different categories
    await client.mutation(api.exercises.create, {
      tenantId: tenantId(),
      name: "Category Filter Squat",
      category: "weightlifting",
    });

    await client.mutation(api.exercises.create, {
      tenantId: tenantId(),
      name: "Category Filter Muscle-Up",
      category: "gymnastics",
    });

    const weightlifting = await client.query(api.exercises.list, {
      tenantId: tenantId(),
      category: "weightlifting",
    });

    const gymnastics = await client.query(api.exercises.list, {
      tenantId: tenantId(),
      category: "gymnastics",
    });

    // All weightlifting results should be weightlifting
    for (const e of weightlifting) {
      expect(e.category).toBe("weightlifting");
    }

    // All gymnastics results should be gymnastics
    for (const e of gymnastics) {
      expect(e.category).toBe("gymnastics");
    }
  });

  // --------------------------------------------------------------------------
  // Search
  // --------------------------------------------------------------------------

  test("search exercises by name", async () => {
    const client = await clientFor("bob");

    // Create an exercise with a unique name for search
    await client.mutation(api.exercises.create, {
      tenantId: tenantId(),
      name: "ZebraSearch Unique Exercise",
      category: "monostructural",
    });

    const results = await client.query(api.exercises.search, {
      tenantId: tenantId(),
      query: "ZebraSearch",
    });

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].name).toContain("ZebraSearch");
  });

  test("search exercises by alias", async () => {
    const client = await clientFor("bob");

    await client.mutation(api.exercises.create, {
      tenantId: tenantId(),
      name: "Some Obscure Lift",
      category: "weightlifting",
      aliases: ["ZebraAlias Unique"],
    });

    const results = await client.query(api.exercises.search, {
      tenantId: tenantId(),
      query: "ZebraAlias",
    });

    expect(results.length).toBeGreaterThanOrEqual(1);
    const names = results.map((r: { name: string }) => r.name);
    expect(names).toContain("Some Obscure Lift");
  });

  test("search returns max 20 results", async () => {
    const client = await clientFor("dave");

    // Just verify the search does not exceed 20
    const results = await client.query(api.exercises.search, {
      tenantId: tenantId(),
      query: "a", // broad search
    });

    expect(results.length).toBeLessThanOrEqual(20);
  });

  // --------------------------------------------------------------------------
  // RBAC enforcement — update/delete requires coach+
  // --------------------------------------------------------------------------

  test("athlete cannot update exercises (coach+ required)", async () => {
    const coachClient = await clientFor("bob");

    const exerciseId = await coachClient.mutation(api.exercises.create, {
      tenantId: tenantId(),
      name: "Athlete Update Target",
      category: "weightlifting",
    });

    const athleteClient = await clientFor("dave");

    await expectToThrow(
      () =>
        athleteClient.mutation(api.exercises.update, {
          tenantId: tenantId(),
          exerciseId: exerciseId as Id<"exercises">,
          name: "Hacked Name",
        }),
      "Insufficient role"
    );
  });

  test("athlete cannot delete exercises (coach+ required)", async () => {
    const coachClient = await clientFor("bob");

    const exerciseId = await coachClient.mutation(api.exercises.create, {
      tenantId: tenantId(),
      name: "Athlete Delete Target",
      category: "weightlifting",
    });

    const athleteClient = await clientFor("dave");

    await expectToThrow(
      () =>
        athleteClient.mutation(api.exercises.remove, {
          tenantId: tenantId(),
          exerciseId: exerciseId as Id<"exercises">,
        }),
      "Insufficient role"
    );
  });

  // --------------------------------------------------------------------------
  // Cannot modify platform exercises
  // --------------------------------------------------------------------------

  test("coach cannot modify platform exercises", async () => {
    const client = await clientFor("bob");

    // List all exercises — platform exercises have tenantId === undefined
    const allExercises = await client.query(api.exercises.list, {
      tenantId: tenantId(),
    });

    const platformExercise = allExercises.find((e) => e.tenantId === undefined);
    if (platformExercise) {
      await expectToThrow(
        () =>
          client.mutation(api.exercises.update, {
            tenantId: tenantId(),
            exerciseId: platformExercise._id,
            name: "Hacked Platform Exercise",
          }),
        "Cannot modify platform exercises"
      );

      await expectToThrow(
        () =>
          client.mutation(api.exercises.remove, {
            tenantId: tenantId(),
            exerciseId: platformExercise._id,
          }),
        "Cannot delete platform exercises"
      );
    }
  });

  // --------------------------------------------------------------------------
  // Tenant isolation
  // --------------------------------------------------------------------------

  test("user cannot access exercises from another tenant", async () => {
    // Grace is owner of cfBeta, create an exercise there
    const graceClient = await clientFor("grace");

    const betaExerciseId = await graceClient.mutation(api.exercises.create, {
      tenantId: betaTenantId(),
      name: "Beta Tenant Only Exercise",
      category: "weightlifting",
    });
    expectValidId(betaExerciseId);

    // Dave (cfAlpha athlete) should not see cfBeta exercise via getById
    const daveClient = await clientFor("dave");

    await expectToThrow(
      () =>
        daveClient.query(api.exercises.getById, {
          tenantId: tenantId(),
          exerciseId: betaExerciseId as Id<"exercises">,
        }),
      "Exercise not found"
    );
  });

  test("exercises listed for one tenant do not include another tenant's custom exercises", async () => {
    const graceClient = await clientFor("grace");

    // Create a uniquely named exercise in cfBeta
    await graceClient.mutation(api.exercises.create, {
      tenantId: betaTenantId(),
      name: "IsolationTestExercise Beta Only",
      category: "gymnastics",
    });

    // List exercises in cfAlpha — should not contain the Beta exercise
    const daveClient = await clientFor("dave");
    const alphaExercises = await daveClient.query(api.exercises.list, {
      tenantId: tenantId(),
    });

    const names = alphaExercises.map((e) => e.name);
    expect(names).not.toContain("IsolationTestExercise Beta Only");
  });

  test("coach in tenant A cannot update exercise in tenant B", async () => {
    const graceClient = await clientFor("grace");

    const betaExerciseId = await graceClient.mutation(api.exercises.create, {
      tenantId: betaTenantId(),
      name: "Cross Tenant Update Target",
      category: "weightlifting",
    });

    // Bob is coach in cfAlpha, not cfBeta
    const bobClient = await clientFor("bob");

    await expectToThrow(
      () =>
        bobClient.mutation(api.exercises.update, {
          tenantId: tenantId(),
          exerciseId: betaExerciseId as Id<"exercises">,
          name: "Hacked Cross Tenant",
        }),
      "Exercise not found"
    );
  });
});
