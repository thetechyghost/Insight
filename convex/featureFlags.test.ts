import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

function identity(email: string) {
  return {
    email,
    subject: `user|${email}`,
    tokenIdentifier: `test|${email}`,
  };
}

describe("featureFlags", () => {
  test("create and list returns the flag", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
    });

    const asAdmin = t.withIdentity(identity("admin@test.com"));

    const flagId = await asAdmin.mutation(
      api.featureFlags.create,
      { name: "dark_mode", status: "enabled" },
    );

    const flags = await asAdmin.query(api.featureFlags.list, {});
    expect(flags).toHaveLength(1);
    expect(flags[0].name).toBe("dark_mode");
    expect(flags[0]._id).toEqual(flagId);
  });

  test("isEnabled returns true for enabled flag", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      await ctx.db.insert("feature_flags", {
        name: "new_dashboard", status: "enabled",
      });
    });

    const result = await t.query(api.featureFlags.isEnabled, { name: "new_dashboard" });
    expect(result).toBe(true);
  });

  test("isEnabled returns false for disabled flag", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      await ctx.db.insert("feature_flags", {
        name: "beta_feature", status: "disabled",
      });
    });

    const result = await t.query(api.featureFlags.isEnabled, { name: "beta_feature" });
    expect(result).toBe(false);
  });

  test("isEnabled returns false for nonexistent flag", async () => {
    const t = convexTest(schema);

    const result = await t.query(api.featureFlags.isEnabled, { name: "does_not_exist" });
    expect(result).toBe(false);
  });

  test("getByName returns flag details", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      await ctx.db.insert("feature_flags", {
        name: "analytics_v2", status: "percentage_rollout",
        rolloutPercentage: 50,
      });
    });

    const flag = await t.query(api.featureFlags.getByName, { name: "analytics_v2" });
    expect(flag).not.toBeNull();
    expect(flag!.status).toBe("percentage_rollout");
    expect(flag!.rolloutPercentage).toBe(50);
  });
});
