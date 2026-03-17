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

describe("platformExercises", () => {
  test("list returns only platform exercises", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    await t.run(async (ctx) => {
      // Platform exercise (no tenantId)
      await ctx.db.insert("exercises", {
        name: "Back Squat", category: "weightlifting",
      });
      // Tenant exercise (has tenantId)
      const tenantId = await ctx.db.insert("tenants", { name: "T1", slug: "t1" });
      await ctx.db.insert("exercises", {
        name: "Custom Move", category: "other", tenantId,
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const exercises = await asAdmin.query(api.platformExercises.list, {});
    expect(exercises).toHaveLength(1);
    expect(exercises[0].name).toBe("Back Squat");
  });

  test("list filters by category", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("exercises", { name: "Snatch", category: "weightlifting" });
      await ctx.db.insert("exercises", { name: "Pull-up", category: "gymnastics" });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const result = await asAdmin.query(api.platformExercises.list, { category: "gymnastics" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Pull-up");
  });

  test("list filters by search", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("exercises", { name: "Clean and Jerk", category: "weightlifting" });
      await ctx.db.insert("exercises", { name: "Deadlift", category: "weightlifting" });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const result = await asAdmin.query(api.platformExercises.list, { search: "clean" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Clean and Jerk");
  });

  test("create inserts a platform exercise", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const id = await asAdmin.mutation(api.platformExercises.create, {
      name: "Thruster",
      category: "weightlifting",
      equipment: ["barbell"],
      difficultyLevel: "intermediate",
    });

    const exercise = await t.run(async (ctx) => ctx.db.get(id));
    expect(exercise!.name).toBe("Thruster");
    expect(exercise!.tenantId).toBeUndefined();

    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.useRealTimers();
  });

  test("create rejects empty name", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await expect(
      asAdmin.mutation(api.platformExercises.create, { name: " ", category: "other" })
    ).rejects.toThrow("cannot be empty");
  });

  test("update patches exercise", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    const exerciseId = await t.run(async (ctx) => {
      return await ctx.db.insert("exercises", {
        name: "Row", category: "monostructural",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await asAdmin.mutation(api.platformExercises.update, {
      exerciseId,
      name: "Rowing",
      difficultyLevel: "beginner",
    });

    const updated = await t.run(async (ctx) => ctx.db.get(exerciseId));
    expect(updated!.name).toBe("Rowing");
    expect(updated!.difficultyLevel).toBe("beginner");

    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.useRealTimers();
  });

  test("update rejects tenant-specific exercise", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    const exerciseId = await t.run(async (ctx) => {
      const tenantId = await ctx.db.insert("tenants", { name: "T", slug: "t" });
      return await ctx.db.insert("exercises", {
        name: "Custom", category: "other", tenantId,
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await expect(
      asAdmin.mutation(api.platformExercises.update, { exerciseId, name: "Hacked" })
    ).rejects.toThrow("tenant-specific");
  });

  test("remove deletes a platform exercise", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    const exerciseId = await t.run(async (ctx) => {
      return await ctx.db.insert("exercises", {
        name: "Delete Me", category: "other",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await asAdmin.mutation(api.platformExercises.remove, { exerciseId });

    const deleted = await t.run(async (ctx) => ctx.db.get(exerciseId));
    expect(deleted).toBeNull();

    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.useRealTimers();
  });

  test("remove rejects tenant-specific exercise", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    const exerciseId = await t.run(async (ctx) => {
      const tenantId = await ctx.db.insert("tenants", { name: "T", slug: "t" });
      return await ctx.db.insert("exercises", {
        name: "Custom", category: "other", tenantId,
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await expect(
      asAdmin.mutation(api.platformExercises.remove, { exerciseId })
    ).rejects.toThrow("tenant-specific");
  });

  test("list rejects unauthenticated request", async () => {
    const t = convexTest(schema);
    await expect(t.query(api.platformExercises.list, {})).rejects.toThrow("Not authenticated");
  });

  test("list rejects non-admin user", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Regular", email: "regular@test.com" });
    });
    const asRegular = t.withIdentity({ email: "regular@test.com", subject: "user|regular" });
    await expect(asRegular.query(api.platformExercises.list, {})).rejects.toThrow("Unauthorized");
  });
});
