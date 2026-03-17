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

describe("platformApiKeys", () => {
  test("listAll returns keys across all tenants without keyHash", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    await t.run(async (ctx) => {
      const t1 = await ctx.db.insert("tenants", { name: "Gym A", slug: "gym-a" });
      const t2 = await ctx.db.insert("tenants", { name: "Gym B", slug: "gym-b" });
      await ctx.db.insert("api_keys", {
        tenantId: t1,
        name: "Key A",
        keyHash: "abc123",
        scopes: ["read"],
        rateLimitTier: "standard",
        isActive: true,
      });
      await ctx.db.insert("api_keys", {
        tenantId: t2,
        name: "Key B",
        keyHash: "def456",
        scopes: ["read", "write"],
        rateLimitTier: "premium",
        isActive: true,
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const keys = await asAdmin.query(api.platformApiKeys.listAll, {});
    expect(keys).toHaveLength(2);
    expect(keys.every((k: any) => k.keyHash === undefined)).toBe(true);
  });

  test("revoke sets key inactive", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t);

    const apiKeyId = await t.run(async (ctx) => {
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      return await ctx.db.insert("api_keys", {
        tenantId,
        name: "Compromised",
        keyHash: "hash",
        scopes: ["read"],
        rateLimitTier: "free",
        isActive: true,
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await asAdmin.mutation(api.platformApiKeys.revoke, { apiKeyId });

    const key = await t.run(async (ctx) => ctx.db.get(apiKeyId));
    expect(key!.isActive).toBe(false);
  });

  test("listAll rejects unauthenticated request", async () => {
    const t = convexTest(schema);
    await expect(t.query(api.platformApiKeys.listAll, {})).rejects.toThrow();
  });

  test("listAll rejects non-admin user", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Regular", email: "regular@test.com" });
    });
    const asRegular = t.withIdentity({ email: "regular@test.com", subject: "user|regular" });
    await expect(asRegular.query(api.platformApiKeys.listAll, {})).rejects.toThrow("Unauthorized");
  });
});
