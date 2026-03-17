import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import { seedUserWithTenant, seedUserInDifferentTenant } from "./test/setup";

describe("webhooksOutbound", () => {
  test("create inserts a webhook", async () => {
    const t = convexTest(schema);
    const { tenantId } = await seedUserWithTenant(t, { role: "owner", email: "owner@test.com" });

    const asOwner = t.withIdentity({ email: "owner@test.com", subject: "user|owner" });
    const id = await asOwner.mutation(api.webhooksOutbound.create, {
      tenantId,
      url: "https://example.com/webhook",
      eventsSubscribed: ["member.created", "member.updated"],
      secret: "whsec_test123",
    });

    const webhook = await t.run(async (ctx) => ctx.db.get(id));
    expect(webhook!.url).toBe("https://example.com/webhook");
    expect(webhook!.status).toBe("active");
    expect(webhook!.failureCount).toBe(0);
  });

  test("list returns webhooks for tenant", async () => {
    const t = convexTest(schema);
    const { tenantId } = await seedUserWithTenant(t, { role: "owner", email: "owner@test.com" });

    const asOwner = t.withIdentity({ email: "owner@test.com", subject: "user|owner" });
    await asOwner.mutation(api.webhooksOutbound.create, {
      tenantId,
      url: "https://a.com/hook",
      eventsSubscribed: ["test"],
      secret: "sec",
    });

    const hooks = await asOwner.query(api.webhooksOutbound.list, { tenantId });
    expect(hooks).toHaveLength(1);
  });

  test("update patches webhook fields", async () => {
    const t = convexTest(schema);
    const { tenantId } = await seedUserWithTenant(t, { role: "owner", email: "owner@test.com" });

    const asOwner = t.withIdentity({ email: "owner@test.com", subject: "user|owner" });
    const id = await asOwner.mutation(api.webhooksOutbound.create, {
      tenantId,
      url: "https://old.com",
      eventsSubscribed: ["a"],
      secret: "sec",
    });

    await asOwner.mutation(api.webhooksOutbound.update, {
      tenantId,
      webhookId: id,
      url: "https://new.com",
      status: "disabled",
    });

    const updated = await t.run(async (ctx) => ctx.db.get(id));
    expect(updated!.url).toBe("https://new.com");
    expect(updated!.status).toBe("disabled");
  });

  test("remove deletes a webhook", async () => {
    const t = convexTest(schema);
    const { tenantId } = await seedUserWithTenant(t, { role: "owner", email: "owner@test.com" });

    const asOwner = t.withIdentity({ email: "owner@test.com", subject: "user|owner" });
    const id = await asOwner.mutation(api.webhooksOutbound.create, {
      tenantId,
      url: "https://del.com",
      eventsSubscribed: [],
      secret: "sec",
    });

    await asOwner.mutation(api.webhooksOutbound.remove, { tenantId, webhookId: id });
    const deleted = await t.run(async (ctx) => ctx.db.get(id));
    expect(deleted).toBeNull();
  });

  test("non-owner role is rejected", async () => {
    const t = convexTest(schema);
    const { tenantId } = await seedUserWithTenant(t, { role: "coach", email: "coach@test.com" });

    const asCoach = t.withIdentity({ email: "coach@test.com", subject: "user|coach" });
    await expect(
      asCoach.query(api.webhooksOutbound.list, { tenantId })
    ).rejects.toThrow("Insufficient permissions");
  });

  test("tenant isolation", async () => {
    const t = convexTest(schema);
    const { tenantId: t1 } = await seedUserWithTenant(t, { role: "owner", email: "o1@test.com" });
    const { tenantId: t2 } = await seedUserWithTenant(t, {
      name: "O2", email: "o2@test.com", tenantName: "G2", tenantSlug: "g2", role: "owner",
    });

    const asO1 = t.withIdentity({ email: "o1@test.com", subject: "user|o1" });
    await asO1.mutation(api.webhooksOutbound.create, {
      tenantId: t1,
      url: "https://t1.com",
      eventsSubscribed: [],
      secret: "sec",
    });

    const asO2 = t.withIdentity({ email: "o2@test.com", subject: "user|o2" });
    const hooks = await asO2.query(api.webhooksOutbound.list, { tenantId: t2 });
    expect(hooks).toHaveLength(0);
  });
});
