import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

describe("dailyWod", () => {
  // Helper to seed a coach user, tenant, membership, and a workout definition
  async function seedCoachWithWorkout(t: ReturnType<typeof convexTest>) {
    return await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Coach",
        email: "coach@test.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Gym",
        slug: "gym",
      });
      await ctx.db.insert("memberships", {
        userId,
        tenantId,
        role: "coach",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });
      const workoutDefId = await ctx.db.insert("workout_definitions", {
        workoutType: "AMRAP",
        name: "Test WOD",
        components: [
          {
            exerciseName: "Thrusters",
            reps: 21,
            order: 1,
          },
        ],
        tenantId,
      });
      return { userId, tenantId, workoutDefId };
    });
  }

  test("create inserts a daily WOD entry", async () => {
    const t = convexTest(schema);
    const { tenantId, workoutDefId } = await seedCoachWithWorkout(t);

    const asCoach = t.withIdentity({
      email: "coach@test.com",
      subject: "user|coach",
    });

    const wodId = await asCoach.mutation(api.dailyWod.create, {
      tenantId,
      date: "2024-07-01",
      workoutDefinitionId: workoutDefId,
      coachNotes: "Push the pace",
    });

    expect(wodId).toBeDefined();

    const wod = await t.run(async (ctx) => ctx.db.get(wodId));
    expect(wod).not.toBeNull();
    expect(wod!.date).toBe("2024-07-01");
    expect(wod!.coachNotes).toBe("Push the pace");
    expect(wod!.tenantId).toEqual(tenantId);
  });

  test("getByDate returns WODs for the specified date", async () => {
    const t = convexTest(schema);
    const { tenantId, workoutDefId } = await seedCoachWithWorkout(t);

    const asCoach = t.withIdentity({
      email: "coach@test.com",
      subject: "user|coach",
    });

    await asCoach.mutation(api.dailyWod.create, {
      tenantId,
      date: "2024-07-01",
      workoutDefinitionId: workoutDefId,
    });
    await asCoach.mutation(api.dailyWod.create, {
      tenantId,
      date: "2024-07-01",
      workoutDefinitionId: workoutDefId,
      track: "Competitors",
    });
    await asCoach.mutation(api.dailyWod.create, {
      tenantId,
      date: "2024-07-02",
      workoutDefinitionId: workoutDefId,
    });

    const wods = await asCoach.query(api.dailyWod.getByDate, {
      tenantId,
      date: "2024-07-01",
    });

    expect(wods).toHaveLength(2);
    expect(wods.every((w) => w.date === "2024-07-01")).toBe(true);
  });

  test("publish sets publishTime on the WOD", async () => {
    const t = convexTest(schema);
    const { tenantId, workoutDefId } = await seedCoachWithWorkout(t);

    const asCoach = t.withIdentity({
      email: "coach@test.com",
      subject: "user|coach",
    });

    const wodId = await asCoach.mutation(api.dailyWod.create, {
      tenantId,
      date: "2024-07-01",
      workoutDefinitionId: workoutDefId,
    });

    // Before publish, publishTime should be undefined
    const before = await t.run(async (ctx) => ctx.db.get(wodId));
    expect(before!.publishTime).toBeUndefined();

    await asCoach.mutation(api.dailyWod.publish, {
      tenantId,
      wodId,
    });

    const after = await t.run(async (ctx) => ctx.db.get(wodId));
    expect(after!.publishTime).toBeDefined();
    expect(typeof after!.publishTime).toBe("number");
  });

  test("list returns upcoming WODs", async () => {
    const t = convexTest(schema);
    const { tenantId, workoutDefId } = await seedCoachWithWorkout(t);

    const asCoach = t.withIdentity({
      email: "coach@test.com",
      subject: "user|coach",
    });

    // Create WODs for future dates
    const futureDate1 = "2099-01-01";
    const futureDate2 = "2099-01-02";
    const pastDate = "2020-01-01";

    await asCoach.mutation(api.dailyWod.create, {
      tenantId,
      date: futureDate1,
      workoutDefinitionId: workoutDefId,
    });
    await asCoach.mutation(api.dailyWod.create, {
      tenantId,
      date: futureDate2,
      workoutDefinitionId: workoutDefId,
    });
    await asCoach.mutation(api.dailyWod.create, {
      tenantId,
      date: pastDate,
      workoutDefinitionId: workoutDefId,
    });

    const upcoming = await asCoach.query(api.dailyWod.list, { tenantId });

    // Past WOD should not appear; only future ones
    expect(upcoming).toHaveLength(2);
    expect(upcoming.every((w) => w.date >= "2099-01-01")).toBe(true);
  });
});
