import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

function identity(email: string) {
  return {
    email,
    subject: `user|${email}`,
    tokenIdentifier: `test|${email}`,
  };
}

// Schema requires equipment and muscleGroups as non-optional arrays
const exerciseDefaults = {
  equipment: [] as string[],
  muscleGroups: [] as string[],
};

describe("exercises", () => {
  test("list returns platform + tenant exercises", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Coach",
        email: "coach@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      await ctx.db.insert("memberships", {
        userId,
        tenantId,
        role: "coach",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      // Platform exercise (no tenantId)
      await ctx.db.insert("exercises", {
        name: "Back Squat",
        category: "weightlifting",
        ...exerciseDefaults,
      });

      // Tenant-specific exercise
      await ctx.db.insert("exercises", {
        tenantId,
        name: "Custom Squat",
        category: "weightlifting",
        ...exerciseDefaults,
      });

      return { tenantId };
    });

    const asCoach = t.withIdentity(identity("coach@example.com"));

    const exercises = await asCoach.query(api.exercises.list, { tenantId });

    expect(exercises).toHaveLength(2);
    const names = exercises.map((e) => e.name).sort();
    expect(names).toEqual(["Back Squat", "Custom Squat"]);
  });

  test("list does not return other tenant's exercises (isolation)", async () => {
    const t = convexTest(schema);

    const { tenantAId } = await t.run(async (ctx) => {
      const coachId = await ctx.db.insert("users", {
        name: "Coach A",
        email: "coacha@example.com",
      });
      const tenantAId = await ctx.db.insert("tenants", {
        name: "Gym A",
        slug: "gym-a",
      });
      await ctx.db.insert("memberships", {
        userId: coachId,
        tenantId: tenantAId,
        role: "coach",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      // Tenant A exercise
      await ctx.db.insert("exercises", {
        tenantId: tenantAId,
        name: "Gym A Special",
        category: "gymnastics",
        ...exerciseDefaults,
      });

      // Tenant B exercise (should not appear for Tenant A)
      const tenantBId = await ctx.db.insert("tenants", {
        name: "Gym B",
        slug: "gym-b",
      });
      await ctx.db.insert("exercises", {
        tenantId: tenantBId,
        name: "Gym B Special",
        category: "gymnastics",
        ...exerciseDefaults,
      });

      return { tenantAId };
    });

    const asCoachA = t.withIdentity(identity("coacha@example.com"));

    const exercises = await asCoachA.query(api.exercises.list, {
      tenantId: tenantAId,
    });

    expect(exercises).toHaveLength(1);
    expect(exercises[0].name).toBe("Gym A Special");
  });

  test("list filters by category correctly", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Coach",
        email: "coach@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      await ctx.db.insert("memberships", {
        userId,
        tenantId,
        role: "coach",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      await ctx.db.insert("exercises", {
        tenantId,
        name: "Snatch",
        category: "weightlifting",
        ...exerciseDefaults,
      });

      await ctx.db.insert("exercises", {
        tenantId,
        name: "Muscle Up",
        category: "gymnastics",
        ...exerciseDefaults,
      });

      await ctx.db.insert("exercises", {
        tenantId,
        name: "Row",
        category: "monostructural",
        ...exerciseDefaults,
      });

      return { tenantId };
    });

    const asCoach = t.withIdentity(identity("coach@example.com"));

    const weightlifting = await asCoach.query(api.exercises.list, {
      tenantId,
      category: "weightlifting",
    });

    expect(weightlifting).toHaveLength(1);
    expect(weightlifting[0].name).toBe("Snatch");
  });

  test("search matches name (case-insensitive)", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Coach",
        email: "coach@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      await ctx.db.insert("memberships", {
        userId,
        tenantId,
        role: "coach",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      await ctx.db.insert("exercises", {
        tenantId,
        name: "Back Squat",
        category: "weightlifting",
        ...exerciseDefaults,
      });

      await ctx.db.insert("exercises", {
        tenantId,
        name: "Front Squat",
        category: "weightlifting",
        ...exerciseDefaults,
      });

      await ctx.db.insert("exercises", {
        tenantId,
        name: "Pull Up",
        category: "gymnastics",
        ...exerciseDefaults,
      });

      return { tenantId };
    });

    const asCoach = t.withIdentity(identity("coach@example.com"));

    const results = await asCoach.query(api.exercises.search, {
      tenantId,
      query: "squat",
    });

    expect(results).toHaveLength(2);
    const names = results.map((r) => r.name).sort();
    expect(names).toEqual(["Back Squat", "Front Squat"]);
  });

  test("create requires coach role (athlete fails)", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Athlete",
        email: "athlete@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
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

    const asAthlete = t.withIdentity(identity("athlete@example.com"));

    await expect(
      asAthlete.mutation(api.exercises.create, {
        tenantId,
        name: "My Exercise",
        category: "weightlifting",
        equipment: [],
        muscleGroups: [],
      })
    ).rejects.toThrow("Insufficient permissions");
  });

  test("create sets tenantId to current tenant", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Coach",
        email: "coach@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      await ctx.db.insert("memberships", {
        userId,
        tenantId,
        role: "coach",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asCoach = t.withIdentity(identity("coach@example.com"));

    const exerciseId = await asCoach.mutation(api.exercises.create, {
      tenantId,
      name: "Custom Move",
      category: "gymnastics",
      equipment: [],
      muscleGroups: [],
    });

    const exercise = await t.run(async (ctx) => {
      return await ctx.db.get(exerciseId);
    });

    expect(exercise!.tenantId).toEqual(tenantId);
  });

  test("update rejects edits to platform exercises (tenantId undefined)", async () => {
    const t = convexTest(schema);

    const { tenantId, platformExerciseId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Coach",
        email: "coach@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      await ctx.db.insert("memberships", {
        userId,
        tenantId,
        role: "coach",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      // Platform exercise (no tenantId)
      const platformExerciseId = await ctx.db.insert("exercises", {
        name: "Deadlift",
        category: "weightlifting",
        ...exerciseDefaults,
      });

      return { tenantId, platformExerciseId };
    });

    const asCoach = t.withIdentity(identity("coach@example.com"));

    await expect(
      asCoach.mutation(api.exercises.update, {
        tenantId,
        exerciseId: platformExerciseId,
        name: "Hacked Deadlift",
      })
    ).rejects.toThrow("Cannot modify platform exercises");
  });

  test("remove rejects deletion of platform exercises", async () => {
    const t = convexTest(schema);

    const { tenantId, platformExerciseId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Coach",
        email: "coach@example.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Test Gym",
        slug: "test-gym",
      });
      await ctx.db.insert("memberships", {
        userId,
        tenantId,
        role: "coach",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });

      const platformExerciseId = await ctx.db.insert("exercises", {
        name: "Clean and Jerk",
        category: "weightlifting",
        ...exerciseDefaults,
      });

      return { tenantId, platformExerciseId };
    });

    const asCoach = t.withIdentity(identity("coach@example.com"));

    await expect(
      asCoach.mutation(api.exercises.remove, {
        tenantId,
        exerciseId: platformExerciseId,
      })
    ).rejects.toThrow("Cannot delete platform exercises");
  });
});
