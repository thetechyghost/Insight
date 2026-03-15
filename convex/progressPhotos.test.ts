import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("progressPhotos", () => {
  test("create inserts a progress photo", async () => {
    const t = convexTest(schema);

    const { tenantId, fileId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const fileId = await ctx.storage.store(new Blob(["fake-image"]));
      return { tenantId, fileId };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });

    const photoId = await asAlice.mutation(api.progressPhotos.create, {
      tenantId,
      fileId,
      date: "2024-06-01",
      privacySetting: "private",
    });

    expect(photoId).toBeDefined();
    const photo = await t.run(async (ctx) => ctx.db.get(photoId));
    expect(photo!.date).toBe("2024-06-01");
  });

  test("listMine returns only the user's own photos", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId1 = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const userId2 = await ctx.db.insert("users", { name: "Bob", email: "bob@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId: userId1, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      await ctx.db.insert("memberships", {
        userId: userId2, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });

      const fileId = await ctx.storage.store(new Blob(["img"]));

      // Alice's photo
      await ctx.db.insert("progress_photos", {
        userId: userId1, tenantId, fileId,
        date: "2024-06-01", privacySetting: "private",
      });
      // Bob's photo
      await ctx.db.insert("progress_photos", {
        userId: userId2, tenantId, fileId,
        date: "2024-06-02", privacySetting: "private",
      });

      return { tenantId };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });
    const photos = await asAlice.query(api.progressPhotos.listMine, { tenantId });

    expect(photos).toHaveLength(1);
  });

  test("update modifies own photo only", async () => {
    const t = convexTest(schema);

    const { tenantId, fileId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const fileId = await ctx.storage.store(new Blob(["img"]));
      return { tenantId, fileId };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });

    const photoId = await asAlice.mutation(api.progressPhotos.create, {
      tenantId,
      fileId,
      date: "2024-06-01",
      privacySetting: "private",
    });

    await asAlice.mutation(api.progressPhotos.update, {
      tenantId,
      photoId,
      bodyRegionTags: ["front"],
    });

    const updated = await t.run(async (ctx) => ctx.db.get(photoId));
    expect(updated!.bodyRegionTags).toEqual(["front"]);
  });

  test("remove deletes the photo", async () => {
    const t = convexTest(schema);

    const { tenantId, fileId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const tenantId = await ctx.db.insert("tenants", { name: "Gym", slug: "gym" });
      await ctx.db.insert("memberships", {
        userId, tenantId, role: "athlete", status: "active",
        isPrimaryGym: true, joinDate: "2024-01-01",
      });
      const fileId = await ctx.storage.store(new Blob(["img"]));
      return { tenantId, fileId };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });

    const photoId = await asAlice.mutation(api.progressPhotos.create, {
      tenantId,
      fileId,
      date: "2024-06-01",
      privacySetting: "private",
    });

    await asAlice.mutation(api.progressPhotos.remove, { tenantId, photoId });

    const deleted = await t.run(async (ctx) => ctx.db.get(photoId));
    expect(deleted).toBeNull();
  });
});
