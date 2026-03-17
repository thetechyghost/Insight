import { expect, test, describe } from "vitest";
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

describe("platformIntegrations", () => {
  test("listAllWebhooks returns webhooks across all tenants", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    await t.run(async (ctx) => {
      const t1 = await ctx.db.insert("tenants", { name: "G1", slug: "g1" });
      const t2 = await ctx.db.insert("tenants", { name: "G2", slug: "g2" });
      await ctx.db.insert("webhooks_outbound", {
        tenantId: t1, url: "https://a.com", eventsSubscribed: ["x"],
        secret: "s1", status: "active",
      });
      await ctx.db.insert("webhooks_outbound", {
        tenantId: t2, url: "https://b.com", eventsSubscribed: ["y"],
        secret: "s2", status: "failed", failureCount: 5,
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const webhooks = await asAdmin.query(api.platformIntegrations.listAllWebhooks, {});
    expect(webhooks).toHaveLength(2);
  });

  test("listAllConnections returns connections across all tenants", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    await t.run(async (ctx) => {
      const t1 = await ctx.db.insert("tenants", { name: "G1", slug: "g1" });
      const t2 = await ctx.db.insert("tenants", { name: "G2", slug: "g2" });
      await ctx.db.insert("integration_connections", {
        tenantId: t1, provider: "stripe", status: "connected",
      });
      await ctx.db.insert("integration_connections", {
        tenantId: t2, provider: "twilio", status: "error",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const conns = await asAdmin.query(api.platformIntegrations.listAllConnections, {});
    expect(conns).toHaveLength(2);
  });

  test("listAllWebhooks rejects unauthenticated", async () => {
    const t = convexTest(schema);
    await expect(t.query(api.platformIntegrations.listAllWebhooks, {})).rejects.toThrow();
  });

  test("listAllWebhooks rejects non-admin", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Regular", email: "r@test.com" });
    });
    const asR = t.withIdentity({ email: "r@test.com", subject: "user|r" });
    await expect(asR.query(api.platformIntegrations.listAllWebhooks, {})).rejects.toThrow("Unauthorized");
  });
});
