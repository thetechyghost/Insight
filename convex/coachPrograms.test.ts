import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("coachPrograms", () => {
  test("create inserts a new coach program as draft", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Coach",
        email: "coach@test.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Gym",
        slug: "gym",
      });
      await ctx.db.insert("memberships", {
        userId,
        tenantId,
        role: "coach",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asCoach = t.withIdentity({
      email: "coach@test.com",
      subject: "user|coach",
    });

    const programId = await asCoach.mutation(api.coachPrograms.create, {
      tenantId,
      name: "Strength Cycle",
      periodizationType: "linear",
      track: "Competitors",
    });

    expect(programId).toBeDefined();

    const program = await t.run(async (ctx) => ctx.db.get(programId));
    expect(program).not.toBeNull();
    expect(program!.name).toBe("Strength Cycle");
    expect(program!.publishedStatus).toBe("draft");
    expect(program!.periodizationType).toBe("linear");
    expect(program!.track).toBe("Competitors");
  });

  test("list returns programs for the tenant", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Coach",
        email: "coach@test.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Gym",
        slug: "gym",
      });
      await ctx.db.insert("memberships", {
        userId,
        tenantId,
        role: "coach",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asCoach = t.withIdentity({
      email: "coach@test.com",
      subject: "user|coach",
    });

    await asCoach.mutation(api.coachPrograms.create, {
      tenantId,
      name: "Program A",
    });
    await asCoach.mutation(api.coachPrograms.create, {
      tenantId,
      name: "Program B",
    });

    const programs = await asCoach.query(api.coachPrograms.list, { tenantId });

    expect(programs).toHaveLength(2);
    const names = programs.map((p) => p.name).sort();
    expect(names).toEqual(["Program A", "Program B"]);
  });

  test("publish sets publishedStatus to published", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Coach",
        email: "coach@test.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Gym",
        slug: "gym",
      });
      await ctx.db.insert("memberships", {
        userId,
        tenantId,
        role: "coach",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asCoach = t.withIdentity({
      email: "coach@test.com",
      subject: "user|coach",
    });

    const programId = await asCoach.mutation(api.coachPrograms.create, {
      tenantId,
      name: "Draft Program",
    });

    await asCoach.mutation(api.coachPrograms.publish, {
      tenantId,
      programId,
    });

    const program = await t.run(async (ctx) => ctx.db.get(programId));
    expect(program!.publishedStatus).toBe("published");
  });

  test("duplicate creates a copy with (Copy) suffix as draft", async () => {
    const t = convexTest(schema);

    const { tenantId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Coach",
        email: "coach@test.com",
      });
      const tenantId = await ctx.db.insert("tenants", {
        name: "Gym",
        slug: "gym",
      });
      await ctx.db.insert("memberships", {
        userId,
        tenantId,
        role: "coach",
        status: "active",
        isPrimaryGym: true,
        joinDate: "2024-01-01",
      });
      return { tenantId };
    });

    const asCoach = t.withIdentity({
      email: "coach@test.com",
      subject: "user|coach",
    });

    const originalId = await asCoach.mutation(api.coachPrograms.create, {
      tenantId,
      name: "Original Program",
      periodizationType: "undulating",
      track: "Fitness",
    });

    // Publish the original
    await asCoach.mutation(api.coachPrograms.publish, {
      tenantId,
      programId: originalId,
    });

    // Duplicate it
    const copyId = await asCoach.mutation(api.coachPrograms.duplicate, {
      tenantId,
      programId: originalId,
    });

    expect(copyId).not.toEqual(originalId);

    const copy = await t.run(async (ctx) => ctx.db.get(copyId));
    expect(copy).not.toBeNull();
    expect(copy!.name).toBe("Original Program (Copy)");
    expect(copy!.publishedStatus).toBe("draft");
    expect(copy!.periodizationType).toBe("undulating");
    expect(copy!.track).toBe("Fitness");
  });
});
