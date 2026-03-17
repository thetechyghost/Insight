import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("ageVerification", () => {
  test("submit creates a pending verification record", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", { name: "Minor", email: "minor@test.com" });
    });

    const asMinor = t.withIdentity({ email: "minor@test.com", subject: "user|minor" });
    const id = await asMinor.mutation(api.ageVerification.submit, {
      userId,
      guardianContact: { name: "Parent", email: "parent@test.com" },
      verificationMethod: "email",
    });

    const record = await t.run(async (ctx) => ctx.db.get(id));
    expect(record).not.toBeNull();
    expect(record!.consentStatus).toBe("pending");
    expect(record!.guardianContact?.name).toBe("Parent");
  });

  test("submit rejects duplicate for same user", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) => {
      const uid = await ctx.db.insert("users", { name: "Minor", email: "minor@test.com" });
      await ctx.db.insert("age_verification", {
        userId: uid,
        consentStatus: "pending",
      });
      return uid;
    });

    const asMinor = t.withIdentity({ email: "minor@test.com", subject: "user|minor" });
    await expect(
      asMinor.mutation(api.ageVerification.submit, { userId })
    ).rejects.toThrow("already exists");
  });

  test("approve changes status to granted", async () => {
    const t = convexTest(schema);

    const verificationId = await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      const userId = await ctx.db.insert("users", { name: "Minor", email: "minor@test.com" });
      return await ctx.db.insert("age_verification", {
        userId,
        consentStatus: "pending",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    await asAdmin.mutation(api.ageVerification.approve, { verificationId });

    const record = await t.run(async (ctx) => ctx.db.get(verificationId));
    expect(record!.consentStatus).toBe("granted");
  });

  test("deny changes status to denied", async () => {
    const t = convexTest(schema);

    const verificationId = await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      const userId = await ctx.db.insert("users", { name: "Minor", email: "minor@test.com" });
      return await ctx.db.insert("age_verification", {
        userId,
        consentStatus: "pending",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    await asAdmin.mutation(api.ageVerification.deny, { verificationId });

    const record = await t.run(async (ctx) => ctx.db.get(verificationId));
    expect(record!.consentStatus).toBe("denied");
  });

  test("getByUser returns verification for user", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) => {
      const uid = await ctx.db.insert("users", { name: "Minor", email: "minor@test.com" });
      await ctx.db.insert("age_verification", {
        userId: uid,
        consentStatus: "pending",
        guardianContact: { name: "Mom", email: "mom@test.com" },
      });
      return uid;
    });

    const asMinor = t.withIdentity({ email: "minor@test.com", subject: "user|minor" });
    const record = await asMinor.query(api.ageVerification.getByUser, { userId });
    expect(record).not.toBeNull();
    expect(record!.guardianContact?.name).toBe("Mom");
  });

  test("getByUser returns null for user without verification", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", { name: "Adult", email: "adult@test.com" });
    });

    const asAdult = t.withIdentity({ email: "adult@test.com", subject: "user|adult" });
    const record = await asAdult.query(api.ageVerification.getByUser, { userId });
    expect(record).toBeNull();
  });

  test("listAll returns all verification records", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      const u1 = await ctx.db.insert("users", { name: "Minor1", email: "m1@test.com" });
      const u2 = await ctx.db.insert("users", { name: "Minor2", email: "m2@test.com" });
      await ctx.db.insert("age_verification", { userId: u1, consentStatus: "pending" });
      await ctx.db.insert("age_verification", { userId: u2, consentStatus: "granted" });
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    const all = await asAdmin.query(api.ageVerification.listAll, {});
    expect(all).toHaveLength(2);
  });

  test("submit rejects unauthenticated request", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", { name: "Minor", email: "minor@test.com" });
    });
    await expect(
      t.mutation(api.ageVerification.submit, { userId })
    ).rejects.toThrow();
  });

  test("listAll rejects unauthenticated request", async () => {
    const t = convexTest(schema);
    await expect(t.query(api.ageVerification.listAll, {})).rejects.toThrow();
  });
});
