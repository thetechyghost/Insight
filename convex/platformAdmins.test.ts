import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/** Helper: seed a user and make them a platform admin */
async function seedPlatformAdmin(
  t: ReturnType<typeof convexTest>,
  options?: {
    email?: string;
    name?: string;
    platformRole?: "super_admin" | "platform_support" | "platform_ops";
    status?: "active" | "suspended";
  }
) {
  const email = options?.email ?? "admin@platform.com";
  const name = options?.name ?? "Platform Admin";
  const platformRole = options?.platformRole ?? "super_admin";
  const status = options?.status ?? "active";

  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name, email });
    const platformAdminId = await ctx.db.insert("platform_admins", {
      userId,
      platformRole,
      status,
    });
    return { userId, platformAdminId };
  });
}

describe("platformAdmins", () => {
  test("getMe returns platform admin for active admin", async () => {
    const t = convexTest(schema);
    const { userId } = await seedPlatformAdmin(t);

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const result = await asAdmin.query(api.platformAdmins.getMe, {});

    expect(result).not.toBeNull();
    expect(result!.platformRole).toBe("super_admin");
    expect(result!.status).toBe("active");
  });

  test("getMe rejects unauthenticated request", async () => {
    const t = convexTest(schema);
    await expect(t.query(api.platformAdmins.getMe, {})).rejects.toThrow("Not authenticated");
  });

  test("getMe rejects non-admin user", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Regular", email: "regular@test.com" });
    });

    const asRegular = t.withIdentity({ email: "regular@test.com", subject: "user|regular" });
    await expect(asRegular.query(api.platformAdmins.getMe, {})).rejects.toThrow("Unauthorized");
  });

  test("getMe rejects suspended admin", async () => {
    const t = convexTest(schema);
    await seedPlatformAdmin(t, { status: "suspended" });

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    await expect(asAdmin.query(api.platformAdmins.getMe, {})).rejects.toThrow("Unauthorized");
  });
});
