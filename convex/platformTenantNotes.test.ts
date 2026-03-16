import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedPlatformAdmin(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "Admin", email: "admin@platform.com" });
    await ctx.db.insert("platform_admins", {
      userId, platformRole: "super_admin" as const, status: "active" as const,
    });
    const tenantId = await ctx.db.insert("tenants", { name: "Test Gym", slug: "test-gym" });
    return { userId, tenantId };
  });
}

describe("platformTenantNotes", () => {
  test("create adds a note and listByTenant returns it", async () => {
    const t = convexTest(schema);
    const { tenantId } = await seedPlatformAdmin(t);

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const noteId = await asAdmin.mutation(api.platformTenantNotes.create, {
      tenantId,
      content: "Initial setup complete",
    });

    expect(noteId).toBeDefined();

    const notes = await asAdmin.query(api.platformTenantNotes.listByTenant, { tenantId });
    expect(notes).toHaveLength(1);
    expect(notes[0].content).toBe("Initial setup complete");
  });

  test("update modifies note content", async () => {
    const t = convexTest(schema);
    const { tenantId } = await seedPlatformAdmin(t);

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const noteId = await asAdmin.mutation(api.platformTenantNotes.create, {
      tenantId, content: "Draft",
    });

    await asAdmin.mutation(api.platformTenantNotes.update, {
      noteId, content: "Updated content",
    });

    const notes = await asAdmin.query(api.platformTenantNotes.listByTenant, { tenantId });
    expect(notes[0].content).toBe("Updated content");
    expect(notes[0].updatedAt).toBeDefined();
  });

  test("remove deletes a note", async () => {
    const t = convexTest(schema);
    const { tenantId } = await seedPlatformAdmin(t);

    const asAdmin = t.withIdentity({ email: "admin@platform.com", subject: "user|admin" });
    const noteId = await asAdmin.mutation(api.platformTenantNotes.create, {
      tenantId, content: "To delete",
    });

    await asAdmin.mutation(api.platformTenantNotes.remove, { noteId });

    const notes = await asAdmin.query(api.platformTenantNotes.listByTenant, { tenantId });
    expect(notes).toHaveLength(0);
  });

  test("rejects non-admin", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Regular", email: "regular@test.com" });
      await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
    });
    const asRegular = t.withIdentity({ email: "regular@test.com", subject: "user|regular" });
    await expect(
      asRegular.query(api.platformTenantNotes.listByTenant, { tenantId: "invalid" as any })
    ).rejects.toThrow();
  });
});
