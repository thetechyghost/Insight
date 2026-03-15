import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

function identity(email: string) {
  return {
    email,
    subject: `user|${email}`,
    tokenIdentifier: `test|${email}`,
  };
}

describe("classRegistrations", () => {
  test("register creates a registration with status registered", async () => {
    const t = convexTest(schema);

    const { tenantId, sessionId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const classId = await ctx.db.insert("classes", {
        tenantId, name: "CrossFit", capacity: 20,
      });
      const sessionId = await ctx.db.insert("class_sessions", {
        classId, tenantId, date: "2024-06-15", status: "scheduled",
      });
      return { tenantId, sessionId };
    });

    const asAlice = t.withIdentity(identity("alice@test.com"));

    const regId = await asAlice.mutation(
      api.classRegistrations.register,
      { tenantId, classSessionId: sessionId, bookingSource: "app" },
    );

    const reg = await t.run(async (ctx) => ctx.db.get(regId));
    expect(reg!.status).toBe("registered");
  });

  test("register waitlists when class is full", async () => {
    const t = convexTest(schema);

    const { tenantId, sessionId } = await t.run(async (ctx) => {
      const user1 = await ctx.db.insert("users", { name: "First", email: "first@test.com" });
      const user2 = await ctx.db.insert("users", { name: "Second", email: "second@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId: user1, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      await ctx.db.insert("memberships", {
        userId: user2, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const classId = await ctx.db.insert("classes", {
        tenantId, name: "Small Class", capacity: 1,
      });
      const sessionId = await ctx.db.insert("class_sessions", {
        classId, tenantId, date: "2024-06-15", status: "scheduled",
      });
      return { tenantId, sessionId };
    });

    const asFirst = t.withIdentity(identity("first@test.com"));
    const asSecond = t.withIdentity(identity("second@test.com"));

    // First registration fills capacity
    await asFirst.mutation(
      api.classRegistrations.register,
      { tenantId, classSessionId: sessionId, bookingSource: "app" },
    );

    // Second registration should be waitlisted
    const waitlistRegId = await asSecond.mutation(
      api.classRegistrations.register,
      { tenantId, classSessionId: sessionId, bookingSource: "app" },
    );

    const reg = await t.run(async (ctx) => ctx.db.get(waitlistRegId));
    expect(reg!.status).toBe("waitlisted");
  });

  test("cancel sets status to late_cancel", async () => {
    const t = convexTest(schema);

    const { tenantId, regId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const classId = await ctx.db.insert("classes", { tenantId, name: "CF", capacity: 20 });
      const sessionId = await ctx.db.insert("class_sessions", {
        classId, tenantId, date: "2024-06-15", status: "scheduled",
      });
      const regId = await ctx.db.insert("class_registrations", {
        classSessionId: sessionId, userId, tenantId, status: "registered",
      });
      return { tenantId, regId };
    });

    const asAlice = t.withIdentity(identity("alice@test.com"));

    await asAlice.mutation(
      api.classRegistrations.cancel,
      { tenantId, registrationId: regId },
    );

    const reg = await t.run(async (ctx) => ctx.db.get(regId));
    expect(reg!.status).toBe("late_cancel");
  });

  test("checkIn sets status to attended (coach)", async () => {
    const t = convexTest(schema);

    const { tenantId, regId } = await t.run(async (ctx) => {
      const coachId = await ctx.db.insert("users", { name: "Coach", email: "coach@test.com" });
      const athleteId = await ctx.db.insert("users", { name: "Athlete", email: "athlete@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId: coachId, tenantId, role: "coach", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const classId = await ctx.db.insert("classes", { tenantId, name: "CF", capacity: 20 });
      const sessionId = await ctx.db.insert("class_sessions", {
        classId, tenantId, date: "2024-06-15", status: "scheduled",
      });
      const regId = await ctx.db.insert("class_registrations", {
        classSessionId: sessionId, userId: athleteId, tenantId, status: "registered",
      });
      return { tenantId, regId };
    });

    const asCoach = t.withIdentity(identity("coach@test.com"));

    await asCoach.mutation(
      api.classRegistrations.checkIn,
      { tenantId, registrationId: regId },
    );

    const reg = await t.run(async (ctx) => ctx.db.get(regId));
    expect(reg!.status).toBe("attended");
    expect(reg!.checkInTime).toBeDefined();
  });

  test("markNoShow sets status to no_show (coach)", async () => {
    const t = convexTest(schema);

    const { tenantId, regId } = await t.run(async (ctx) => {
      const coachId = await ctx.db.insert("users", { name: "Coach", email: "coach@test.com" });
      const athleteId = await ctx.db.insert("users", { name: "Athlete", email: "athlete@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId: coachId, tenantId, role: "coach", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const classId = await ctx.db.insert("classes", { tenantId, name: "CF", capacity: 20 });
      const sessionId = await ctx.db.insert("class_sessions", {
        classId, tenantId, date: "2024-06-15", status: "scheduled",
      });
      const regId = await ctx.db.insert("class_registrations", {
        classSessionId: sessionId, userId: athleteId, tenantId, status: "registered",
      });
      return { tenantId, regId };
    });

    const asCoach = t.withIdentity(identity("coach@test.com"));

    await asCoach.mutation(
      api.classRegistrations.markNoShow,
      { tenantId, registrationId: regId },
    );

    const reg = await t.run(async (ctx) => ctx.db.get(regId));
    expect(reg!.status).toBe("no_show");
  });

  test("promoteFromWaitlist promotes the first waitlisted registration (internal)", async () => {
    const t = convexTest(schema);

    const { sessionId, waitlistRegId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Waiter", email: "waiter@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      const classId = await ctx.db.insert("classes", { tenantId, name: "CF", capacity: 1 });
      const sessionId = await ctx.db.insert("class_sessions", {
        classId, tenantId, date: "2024-06-15", status: "scheduled",
      });
      const waitlistRegId = await ctx.db.insert("class_registrations", {
        classSessionId: sessionId, userId, tenantId, status: "waitlisted",
      });
      return { sessionId, waitlistRegId };
    });

    await t.mutation(internal.classRegistrations.promoteFromWaitlist, {
      classSessionId: sessionId,
    });

    const reg = await t.run(async (ctx) => ctx.db.get(waitlistRegId));
    expect(reg!.status).toBe("registered");
  });
});
