import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import { seedUserWithTenant } from "./test/setup";

describe("integrationConnections", () => {
  test("connect creates a new connection", async () => {
    const t = convexTest(schema);
    const { tenantId } = await seedUserWithTenant(t, { role: "admin", email: "admin@test.com" });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    const id = await asAdmin.mutation(api.integrationConnections.connect, {
      tenantId,
      provider: "stripe",
    });

    const conn = await t.run(async (ctx) => ctx.db.get(id));
    expect(conn!.provider).toBe("stripe");
    expect(conn!.status).toBe("connected");
  });

  test("connect rejects duplicate connected provider", async () => {
    const t = convexTest(schema);
    const { tenantId } = await seedUserWithTenant(t, { role: "admin", email: "admin@test.com" });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    await asAdmin.mutation(api.integrationConnections.connect, {
      tenantId,
      provider: "stripe",
    });

    await expect(
      asAdmin.mutation(api.integrationConnections.connect, { tenantId, provider: "stripe" })
    ).rejects.toThrow("already connected");
  });

  test("disconnect changes status to disconnected", async () => {
    const t = convexTest(schema);
    const { tenantId } = await seedUserWithTenant(t, { role: "admin", email: "admin@test.com" });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    const id = await asAdmin.mutation(api.integrationConnections.connect, {
      tenantId,
      provider: "mailchimp",
    });

    await asAdmin.mutation(api.integrationConnections.disconnect, { tenantId, connectionId: id });

    const conn = await t.run(async (ctx) => ctx.db.get(id));
    expect(conn!.status).toBe("disconnected");
  });

  test("list returns connections for tenant", async () => {
    const t = convexTest(schema);
    const { tenantId } = await seedUserWithTenant(t, { role: "admin", email: "admin@test.com" });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    await asAdmin.mutation(api.integrationConnections.connect, { tenantId, provider: "stripe" });
    await asAdmin.mutation(api.integrationConnections.connect, { tenantId, provider: "twilio" });

    const conns = await asAdmin.query(api.integrationConnections.list, { tenantId });
    expect(conns).toHaveLength(2);
  });

  test("tenant isolation", async () => {
    const t = convexTest(schema);
    const { tenantId: t1 } = await seedUserWithTenant(t, { role: "admin", email: "a1@test.com" });
    const { tenantId: t2 } = await seedUserWithTenant(t, {
      name: "A2", email: "a2@test.com", tenantName: "G2", tenantSlug: "g2", role: "admin",
    });

    const asA1 = t.withIdentity({ email: "a1@test.com", subject: "user|a1" });
    await asA1.mutation(api.integrationConnections.connect, { tenantId: t1, provider: "stripe" });

    const asA2 = t.withIdentity({ email: "a2@test.com", subject: "user|a2" });
    const conns = await asA2.query(api.integrationConnections.list, { tenantId: t2 });
    expect(conns).toHaveLength(0);
  });

  test("non-admin role rejected for connect", async () => {
    const t = convexTest(schema);
    const { tenantId } = await seedUserWithTenant(t, { role: "athlete", email: "ath@test.com" });

    const asAth = t.withIdentity({ email: "ath@test.com", subject: "user|ath" });
    await expect(
      asAth.mutation(api.integrationConnections.connect, { tenantId, provider: "test" })
    ).rejects.toThrow("Insufficient permissions");
  });
});
