import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import { seedUserWithTenant, seedUserInDifferentTenant } from "./test/setup";

describe("apiKeys", () => {
  test("create returns a key and list returns it without keyHash", async () => {
    const t = convexTest(schema);
    const { tenantId } = await seedUserWithTenant(t, { role: "owner", email: "owner@test.com" });

    const asOwner = t.withIdentity({ email: "owner@test.com", subject: "user|owner" });
    const { id, key } = await asOwner.mutation(api.apiKeys.create, {
      tenantId,
      name: "Test Key",
      scopes: ["read"],
      rateLimitTier: "standard",
    });

    expect(key).toMatch(/^ink_/);

    const keys = await asOwner.query(api.apiKeys.list, { tenantId });
    expect(keys).toHaveLength(1);
    expect(keys[0]._id).toBe(id);
    expect(keys[0].name).toBe("Test Key");
    expect((keys[0] as any).keyHash).toBeUndefined();
  });

  test("rotate returns a new key", async () => {
    const t = convexTest(schema);
    const { tenantId } = await seedUserWithTenant(t, { role: "owner", email: "owner@test.com" });

    const asOwner = t.withIdentity({ email: "owner@test.com", subject: "user|owner" });
    const { id } = await asOwner.mutation(api.apiKeys.create, {
      tenantId,
      name: "Rotate Me",
      scopes: ["write"],
      rateLimitTier: "free",
    });

    const { key: newKey } = await asOwner.mutation(api.apiKeys.rotate, {
      tenantId,
      apiKeyId: id,
    });
    expect(newKey).toMatch(/^ink_/);
  });

  test("revoke sets isActive to false", async () => {
    const t = convexTest(schema);
    const { tenantId } = await seedUserWithTenant(t, { role: "owner", email: "owner@test.com" });

    const asOwner = t.withIdentity({ email: "owner@test.com", subject: "user|owner" });
    const { id } = await asOwner.mutation(api.apiKeys.create, {
      tenantId,
      name: "Revoke Me",
      scopes: ["read"],
      rateLimitTier: "premium",
    });

    await asOwner.mutation(api.apiKeys.revoke, { tenantId, apiKeyId: id });

    const keys = await asOwner.query(api.apiKeys.list, { tenantId });
    expect(keys[0].isActive).toBe(false);
  });

  test("non-owner role is rejected", async () => {
    const t = convexTest(schema);
    const { tenantId } = await seedUserWithTenant(t, { role: "coach", email: "coach@test.com" });

    const asCoach = t.withIdentity({ email: "coach@test.com", subject: "user|coach" });
    await expect(
      asCoach.query(api.apiKeys.list, { tenantId })
    ).rejects.toThrow("Insufficient permissions");
  });

  test("tenant isolation — keys from other tenant not visible", async () => {
    const t = convexTest(schema);
    const { tenantId: t1 } = await seedUserWithTenant(t, { role: "owner", email: "owner1@test.com" });
    await seedUserInDifferentTenant(t, { email: "owner2@test.com" });

    const asOwner1 = t.withIdentity({ email: "owner1@test.com", subject: "user|owner1" });
    await asOwner1.mutation(api.apiKeys.create, {
      tenantId: t1,
      name: "T1 Key",
      scopes: ["read"],
      rateLimitTier: "standard",
    });

    // owner2 sees nothing in their own tenant
    const { tenantId: t2 } = await seedUserWithTenant(t, {
      name: "Owner2",
      email: "o2@test.com",
      tenantName: "Gym2",
      tenantSlug: "gym2",
      role: "owner",
    });
    const asOwner2 = t.withIdentity({ email: "o2@test.com", subject: "user|o2" });
    const keys = await asOwner2.query(api.apiKeys.list, { tenantId: t2 });
    expect(keys).toHaveLength(0);
  });

  test("list rejects unauthenticated request", async () => {
    const t = convexTest(schema);
    const { tenantId } = await seedUserWithTenant(t);
    await expect(t.query(api.apiKeys.list, { tenantId })).rejects.toThrow();
  });
});
