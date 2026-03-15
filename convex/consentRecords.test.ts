import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("consentRecords", () => {
  test("record creates a consent record", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });
    const consentId = await asAlice.mutation(api.consentRecords.record, {
      type: "privacy_policy", version: "1.0",
    });

    const consent = await t.run(async (ctx) => ctx.db.get(consentId));
    expect(consent!.type).toBe("privacy_policy");
    expect(consent!.versionAccepted).toBe("1.0");
    expect(consent!.timestamp).toBeDefined();
  });

  test("listMine returns consent records for current user", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      await ctx.db.insert("consent_records", {
        userId, type: "terms_of_service", versionAccepted: "2.0", timestamp: Date.now(),
      });
      await ctx.db.insert("consent_records", {
        userId, type: "marketing", versionAccepted: "1.0", timestamp: Date.now(),
      });
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });
    const records = await asAlice.query(api.consentRecords.listMine, {});
    expect(records).toHaveLength(2);
  });

  test("withdraw deletes own consent record", async () => {
    const t = convexTest(schema);

    const { consentId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
      const consentId = await ctx.db.insert("consent_records", {
        userId, type: "marketing", versionAccepted: "1.0", timestamp: Date.now(),
      });
      return { consentId };
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });
    await asAlice.mutation(api.consentRecords.withdraw, { consentId });

    const deleted = await t.run(async (ctx) => ctx.db.get(consentId));
    expect(deleted).toBeNull();
  });
});
