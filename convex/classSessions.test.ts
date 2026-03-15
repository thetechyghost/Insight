import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("classSessions", () => {
  // Helper to seed coach, tenant, membership, and a class
  async function seedCoachWithClass(t: ReturnType<typeof convexTest>) {
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
      const classId = await ctx.db.insert("classes", {
        tenantId,
        name: "CrossFit",
        capacity: 20,
      });
      return { userId, tenantId, classId };
    });
  }

  test("create inserts a new class session with scheduled status", async () => {
    const t = convexTest(schema);
    const { tenantId, classId } = await seedCoachWithClass(t);

    const asCoach = t.withIdentity({
      email: "coach@test.com",
      subject: "user|coach",
    });

    const sessionId = await asCoach.mutation(api.classSessions.create, {
      tenantId,
      classId,
      date: "2024-07-15",
      startTime: "09:00",
    });

    expect(sessionId).toBeDefined();

    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(session).not.toBeNull();
    expect(session!.date).toBe("2024-07-15");
    expect(session!.startTime).toBe("09:00");
    expect(session!.status).toBe("scheduled");
    expect(session!.tenantId).toEqual(tenantId);
    expect(session!.classId).toEqual(classId);
  });

  test("listByDate returns sessions for the given date", async () => {
    const t = convexTest(schema);
    const { tenantId, classId } = await seedCoachWithClass(t);

    const asCoach = t.withIdentity({
      email: "coach@test.com",
      subject: "user|coach",
    });

    await asCoach.mutation(api.classSessions.create, {
      tenantId,
      classId,
      date: "2024-07-15",
      startTime: "09:00",
    });
    await asCoach.mutation(api.classSessions.create, {
      tenantId,
      classId,
      date: "2024-07-15",
      startTime: "10:00",
    });
    await asCoach.mutation(api.classSessions.create, {
      tenantId,
      classId,
      date: "2024-07-16",
      startTime: "09:00",
    });

    const sessions = await asCoach.query(api.classSessions.listByDate, {
      tenantId,
      date: "2024-07-15",
    });

    expect(sessions).toHaveLength(2);
    expect(sessions.every((s) => s.date === "2024-07-15")).toBe(true);
  });

  test("cancel sets status to cancelled", async () => {
    const t = convexTest(schema);
    const { tenantId, classId } = await seedCoachWithClass(t);

    const asCoach = t.withIdentity({
      email: "coach@test.com",
      subject: "user|coach",
    });

    const sessionId = await asCoach.mutation(api.classSessions.create, {
      tenantId,
      classId,
      date: "2024-07-15",
      startTime: "09:00",
    });

    await asCoach.mutation(api.classSessions.cancel, {
      tenantId,
      sessionId,
    });

    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(session!.status).toBe("cancelled");
  });

  test("assignCoach sets the coachId on the session", async () => {
    const t = convexTest(schema);
    const { userId, tenantId, classId } = await seedCoachWithClass(t);

    // Create a second coach to assign
    const { secondCoachId } = await t.run(async (ctx) => {
      const secondCoachId = await ctx.db.insert("users", {
        name: "Coach B",
        email: "coachb@test.com",
      });
      await ctx.db.insert("memberships", {
        userId: secondCoachId,
        tenantId,
        role: "coach",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });
      return { secondCoachId };
    });

    const asCoach = t.withIdentity({
      email: "coach@test.com",
      subject: "user|coach",
    });

    const sessionId = await asCoach.mutation(api.classSessions.create, {
      tenantId,
      classId,
      date: "2024-07-15",
    });

    // Session initially has no coach assigned
    const before = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(before!.coachId).toBeUndefined();

    await asCoach.mutation(api.classSessions.assignCoach, {
      tenantId,
      sessionId,
      coachId: secondCoachId,
    });

    const after = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(after!.coachId).toEqual(secondCoachId);
  });
});
