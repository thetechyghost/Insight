import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

describe("securityEvents", () => {
  test("log creates a security event with timestamp", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
    });

    const eventId = await t.run(async (ctx) => {
      return await ctx.runMutation(internal.securityEvents.log, {
        userId,
        eventType: "login_success",
        ipAddress: "192.168.1.1",
      });
    });

    const event = await t.run(async (ctx) => ctx.db.get(eventId));
    expect(event).not.toBeNull();
    expect(event!.eventType).toBe("login_success");
    expect(event!.ipAddress).toBe("192.168.1.1");
    expect(event!.timestamp).toBeDefined();
  });

  test("list returns events in descending order", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      await ctx.db.insert("security_events", {
        eventType: "login_success",
        timestamp: 1000,
      });
      await ctx.db.insert("security_events", {
        eventType: "login_failure",
        timestamp: 2000,
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    const events = await asAdmin.query(api.securityEvents.list, {});
    expect(events).toHaveLength(2);
    expect(events[0].timestamp).toBeGreaterThan(events[1].timestamp);
  });

  test("list filters by eventType", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      await ctx.db.insert("security_events", {
        eventType: "login_success",
        timestamp: Date.now(),
      });
      await ctx.db.insert("security_events", {
        eventType: "login_failure",
        timestamp: Date.now(),
      });
      await ctx.db.insert("security_events", {
        eventType: "login_failure",
        timestamp: Date.now(),
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    const events = await asAdmin.query(api.securityEvents.list, {
      eventType: "login_failure",
    });
    expect(events).toHaveLength(2);
    expect(events.every((e) => e.eventType === "login_failure")).toBe(true);
  });

  test("list filters by userId", async () => {
    const t = convexTest(schema);

    const { userId } = await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      const userId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      await ctx.db.insert("security_events", {
        userId,
        eventType: "login_success",
        timestamp: Date.now(),
      });
      await ctx.db.insert("security_events", {
        eventType: "login_failure",
        timestamp: Date.now(),
      });
      return { userId };
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    const events = await asAdmin.query(api.securityEvents.list, { userId });
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe("login_success");
  });

  test("list respects limit", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      for (let i = 0; i < 5; i++) {
        await ctx.db.insert("security_events", {
          eventType: "login_success",
          timestamp: Date.now() + i,
        });
      }
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    const events = await asAdmin.query(api.securityEvents.list, { limit: 3 });
    expect(events).toHaveLength(3);
  });

  test("list rejects unauthenticated request", async () => {
    const t = convexTest(schema);
    await expect(t.query(api.securityEvents.list, {})).rejects.toThrow();
  });
});
