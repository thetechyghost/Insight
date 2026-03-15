import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("users", () => {
  test("getMe returns authenticated user profile", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        name: "Alice",
        email: "alice@example.com",
      });
    });

    const asAlice = t.withIdentity({ email: "alice@example.com", subject: "user|alice" });
    const result = await asAlice.query(api.users.getMe, {});

    expect(result).not.toBeNull();
    expect(result!.name).toBe("Alice");
    expect(result!.email).toBe("alice@example.com");
  });

  test("getMe throws when not authenticated", async () => {
    const t = convexTest(schema);

    await expect(
      t.query(api.users.getMe, {})
    ).rejects.toThrow();
  });

  test("createOrGet creates new user when email not found", async () => {
    const t = convexTest(schema);

    const userId = await t.mutation(api.users.createOrGet, {
      name: "Bob",
      email: "bob@example.com",
    });

    expect(userId).toBeDefined();

    const user = await t.run(async (ctx) => {
      return await ctx.db.get(userId);
    });

    expect(user).not.toBeNull();
    expect(user!.name).toBe("Bob");
    expect(user!.email).toBe("bob@example.com");
  });

  test("createOrGet returns existing user when email exists (idempotent)", async () => {
    const t = convexTest(schema);

    const firstId = await t.mutation(api.users.createOrGet, {
      name: "Carol",
      email: "carol@example.com",
    });

    const secondId = await t.mutation(api.users.createOrGet, {
      name: "Carol Different Name",
      email: "carol@example.com",
    });

    expect(secondId).toEqual(firstId);

    // Verify name was NOT updated (idempotent, returns existing)
    const user = await t.run(async (ctx) => {
      return await ctx.db.get(firstId);
    });
    expect(user!.name).toBe("Carol");
  });

  test("updateProfile updates only specified fields", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        name: "Dave",
        email: "dave@example.com",
        bio: "Original bio",
      });
    });

    const asDave = t.withIdentity({ email: "dave@example.com", subject: "user|dave" });
    await asDave.mutation(api.users.updateProfile, { name: "Dave Updated" });

    const user = await t.run(async (ctx) => {
      const u = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", "dave@example.com"))
        .unique();
      return u;
    });

    expect(user!.name).toBe("Dave Updated");
    expect(user!.bio).toBe("Original bio"); // unchanged
  });

  test("updateProfile rejects when not authenticated", async () => {
    const t = convexTest(schema);

    await expect(
      t.mutation(api.users.updateProfile, { name: "Hacker" })
    ).rejects.toThrow();
  });

  test("updateAvatar stores storage ID", async () => {
    const t = convexTest(schema);

    const storageId = await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        name: "Eve",
        email: "eve@example.com",
      });
      // Create a fake storage entry to get a valid storage ID
      return await ctx.storage.store(new Blob(["test"]));
    });

    const asEve = t.withIdentity({ email: "eve@example.com", subject: "user|eve" });
    await asEve.mutation(api.users.updateAvatar, { storageId });

    const user = await t.run(async (ctx) => {
      return await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", "eve@example.com"))
        .unique();
    });

    expect(user!.avatarStorageId).toBe(storageId);
  });

  test("updateNotificationPrefs persists all notification settings", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        name: "Frank",
        email: "frank@example.com",
      });
    });

    const prefs = {
      push: true,
      email: false,
      sms: true,
      inApp: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
      frequencyCapPerHour: 5,
    };

    const asFrank = t.withIdentity({ email: "frank@example.com", subject: "user|frank" });
    await asFrank.mutation(api.users.updateNotificationPrefs, {
      notificationPrefs: prefs,
    });

    const user = await t.run(async (ctx) => {
      return await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", "frank@example.com"))
        .unique();
    });

    expect(user!.notificationPrefs).toEqual(prefs);
  });

  test("updateUnitPreferences persists weight/distance/height preferences", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        name: "Grace",
        email: "grace@example.com",
      });
    });

    const unitPrefs = {
      weight: "lbs" as const,
      distance: "miles" as const,
      height: "ft_in" as const,
    };

    const asGrace = t.withIdentity({ email: "grace@example.com", subject: "user|grace" });
    await asGrace.mutation(api.users.updateUnitPreferences, {
      unitPreferences: unitPrefs,
    });

    const user = await t.run(async (ctx) => {
      return await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", "grace@example.com"))
        .unique();
    });

    expect(user!.unitPreferences).toEqual(unitPrefs);
  });
});
