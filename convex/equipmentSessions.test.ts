import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

describe("equipmentSessions", () => {
  test("start creates an active session (internal)", async () => {
    const t = convexTest(schema);

    const { tenantId, deviceId } = await t.run(async (ctx) => {
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      const deviceId = await ctx.db.insert("devices", {
        tenantId, name: "Rower 1", type: "RowErg", isOnline: true,
      });
      return { tenantId, deviceId };
    });

    const sessionId = await t.mutation(internal.equipmentSessions.start, {
      deviceId, tenantId,
    });

    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(session!.status).toBe("active");
    expect(session!.startedAt).toBeDefined();
  });

  test("complete transitions session to completed (internal)", async () => {
    const t = convexTest(schema);

    const { sessionId } = await t.run(async (ctx) => {
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      const deviceId = await ctx.db.insert("devices", {
        tenantId, name: "Rower 1", type: "RowErg", isOnline: true,
      });
      const sessionId = await ctx.db.insert("equipment_sessions", {
        deviceId, tenantId, status: "active", startedAt: Date.now(),
      });
      return { sessionId };
    });

    await t.mutation(internal.equipmentSessions.complete, {
      sessionId, metrics: { distance: 2000, time: 420 },
    });

    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(session!.status).toBe("completed");
    expect(session!.completedAt).toBeDefined();
  });

  test("assignAthlete links a user to the session (coach)", async () => {
    const t = convexTest(schema);

    const { tenantId, sessionId, athleteId } = await t.run(async (ctx) => {
      const coachUserId = await ctx.db.insert("users", { name: "Coach", email: "coach@test.com" });
      const athleteId = await ctx.db.insert("users", { name: "Athlete", email: "athlete@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId: coachUserId, tenantId, role: "coach", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const deviceId = await ctx.db.insert("devices", {
        tenantId, name: "Rower 1", type: "RowErg", isOnline: true,
      });
      const sessionId = await ctx.db.insert("equipment_sessions", {
        deviceId, tenantId, status: "active", startedAt: Date.now(),
      });
      return { tenantId, sessionId, athleteId };
    });

    const asCoach = t.withIdentity({ email: "coach@test.com", subject: "user|coach" });
    await asCoach.mutation(api.equipmentSessions.assignAthlete, {
      tenantId, sessionId, userId: athleteId,
    });

    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(session!.userId).toBe(athleteId);
  });

  test("abandon marks session as abandoned (coach)", async () => {
    const t = convexTest(schema);

    const { tenantId, sessionId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Coach", email: "coach@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "coach", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const deviceId = await ctx.db.insert("devices", {
        tenantId, name: "Rower 1", type: "RowErg", isOnline: true,
      });
      const sessionId = await ctx.db.insert("equipment_sessions", {
        deviceId, tenantId, status: "active", startedAt: Date.now(),
      });
      return { tenantId, sessionId };
    });

    const asCoach = t.withIdentity({ email: "coach@test.com", subject: "user|coach" });
    await asCoach.mutation(api.equipmentSessions.abandon, { tenantId, sessionId });

    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(session!.status).toBe("abandoned");
  });

  test("listActive returns only active sessions for the tenant", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Coach", email: "coach@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "coach", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const deviceId = await ctx.db.insert("devices", {
        tenantId, name: "Rower 1", type: "RowErg", isOnline: true,
      });
      await ctx.db.insert("equipment_sessions", {
        deviceId, tenantId, status: "active", startedAt: Date.now(),
      });
      await ctx.db.insert("equipment_sessions", {
        deviceId, tenantId, status: "completed", startedAt: Date.now() - 1000, completedAt: Date.now(),
      });
      return { tenantId };
    });

    const asCoach = t.withIdentity({ email: "coach@test.com", subject: "user|coach" });
    const sessions = await asCoach.query(api.equipmentSessions.listActive, { tenantId });
    expect(sessions).toHaveLength(1);
    expect(sessions[0].status).toBe("active");
  });
});
