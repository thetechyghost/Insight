import { expect, test, describe, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedPlatformAdmin(t: ReturnType<typeof convexTest>, options?: { email?: string }) {
  const email = options?.email ?? "admin@platform.com";
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "Platform Admin", email });
    await ctx.db.insert("platform_admins", {
      userId,
      platformRole: "super_admin" as const,
      status: "active" as const,
    });
    return { userId };
  });
}

const sampleMovements = [
  { exerciseName: "Thruster", reps: 21 },
  { exerciseName: "Pull-up", reps: 21 },
];

describe("platformBenchmarkWorkouts", () => {
  test("list returns only platform benchmarks", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("benchmark_workouts", {
        name: "Fran", workoutType: "AMRAP",
        prescribedMovements: sampleMovements,
        scoringMethod: "time",
        category: "Girl",
      });
      const tenantId = await ctx.db.insert("tenants", { name: "T1", slug: "t1" });
      await ctx.db.insert("benchmark_workouts", {
        name: "Custom WOD", workoutType: "ForTime",
        prescribedMovements: sampleMovements,
        scoringMethod: "time",
        tenantId,
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const benchmarks = await asAdmin.query(api.platformBenchmarkWorkouts.list, {});
    expect(benchmarks).toHaveLength(1);
    expect(benchmarks[0].name).toBe("Fran");
  });

  test("list filters by category", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("benchmark_workouts", {
        name: "Fran", workoutType: "ForTime",
        prescribedMovements: sampleMovements, scoringMethod: "time", category: "Girl",
      });
      await ctx.db.insert("benchmark_workouts", {
        name: "Murph", workoutType: "ForTime",
        prescribedMovements: sampleMovements, scoringMethod: "time", category: "Hero",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const result = await asAdmin.query(api.platformBenchmarkWorkouts.list, { category: "Hero" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Murph");
  });

  test("create inserts a platform benchmark", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const id = await asAdmin.mutation(api.platformBenchmarkWorkouts.create, {
      name: "Grace",
      workoutType: "ForTime",
      prescribedMovements: [{ exerciseName: "Clean & Jerk", reps: 30 }],
      scoringMethod: "time",
      category: "Girl",
    });

    const benchmark = await t.run(async (ctx) => ctx.db.get(id));
    expect(benchmark!.name).toBe("Grace");
    expect(benchmark!.tenantId).toBeUndefined();

    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.useRealTimers();
  });

  test("create rejects empty name", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await expect(
      asAdmin.mutation(api.platformBenchmarkWorkouts.create, {
        name: " ", workoutType: "ForTime",
        prescribedMovements: sampleMovements, scoringMethod: "time",
      })
    ).rejects.toThrow("cannot be empty");
  });

  test("update patches benchmark", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    const benchmarkId = await t.run(async (ctx) => {
      return await ctx.db.insert("benchmark_workouts", {
        name: "Helen", workoutType: "ForTime",
        prescribedMovements: sampleMovements, scoringMethod: "time",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await asAdmin.mutation(api.platformBenchmarkWorkouts.update, {
      benchmarkId,
      description: "3 rounds for time",
    });

    const updated = await t.run(async (ctx) => ctx.db.get(benchmarkId));
    expect(updated!.description).toBe("3 rounds for time");

    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.useRealTimers();
  });

  test("update rejects tenant-specific benchmark", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    const benchmarkId = await t.run(async (ctx) => {
      const tenantId = await ctx.db.insert("tenants", { name: "T", slug: "t" });
      return await ctx.db.insert("benchmark_workouts", {
        name: "Custom", workoutType: "AMRAP",
        prescribedMovements: sampleMovements, scoringMethod: "reps", tenantId,
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await expect(
      asAdmin.mutation(api.platformBenchmarkWorkouts.update, { benchmarkId, name: "Hacked" })
    ).rejects.toThrow("tenant-specific");
  });

  test("remove deletes a platform benchmark", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    const benchmarkId = await t.run(async (ctx) => {
      return await ctx.db.insert("benchmark_workouts", {
        name: "Delete Me", workoutType: "ForTime",
        prescribedMovements: sampleMovements, scoringMethod: "time",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await asAdmin.mutation(api.platformBenchmarkWorkouts.remove, { benchmarkId });

    const deleted = await t.run(async (ctx) => ctx.db.get(benchmarkId));
    expect(deleted).toBeNull();

    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.useRealTimers();
  });

  test("remove rejects tenant-specific benchmark", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    const benchmarkId = await t.run(async (ctx) => {
      const tenantId = await ctx.db.insert("tenants", { name: "T", slug: "t" });
      return await ctx.db.insert("benchmark_workouts", {
        name: "Custom", workoutType: "AMRAP",
        prescribedMovements: sampleMovements, scoringMethod: "reps", tenantId,
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await expect(
      asAdmin.mutation(api.platformBenchmarkWorkouts.remove, { benchmarkId })
    ).rejects.toThrow("tenant-specific");
  });

  test("list rejects unauthenticated request", async () => {
    const t = convexTest(schema);
    await expect(t.query(api.platformBenchmarkWorkouts.list, {})).rejects.toThrow("Not authenticated");
  });
});
