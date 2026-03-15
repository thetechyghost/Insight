import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("dataRequests", () => {
  test("submit creates a data request with status received", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Alice", email: "alice@test.com" });
    });

    const asAlice = t.withIdentity({ email: "alice@test.com", subject: "user|alice" });
    const requestId = await asAlice.mutation(api.dataRequests.submit, { type: "export" });

    const request = await t.run(async (ctx) => ctx.db.get(requestId));
    expect(request!.type).toBe("export");
    expect(request!.status).toBe("received");
    expect(request!.submittedDate).toBeDefined();
  });

  test("listAll returns all data requests", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      await ctx.db.insert("data_requests", {
        userId, type: "access", status: "received", submittedDate: Date.now(),
      });
      await ctx.db.insert("data_requests", {
        userId, type: "deletion", status: "processing", submittedDate: Date.now(),
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    const requests = await asAdmin.query(api.dataRequests.listAll, {});
    expect(requests).toHaveLength(2);
  });

  test("complete transitions processing request to completed", async () => {
    const t = convexTest(schema);

    const { requestId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      const requestId = await ctx.db.insert("data_requests", {
        userId, type: "rectification", status: "processing", submittedDate: Date.now(),
      });
      return { requestId };
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    await asAdmin.mutation(api.dataRequests.complete, { requestId });

    const request = await t.run(async (ctx) => ctx.db.get(requestId));
    expect(request!.status).toBe("completed");
    expect(request!.completedDate).toBeDefined();
    expect(request!.auditTrail).toHaveLength(1);
    expect(request!.auditTrail![0].action).toBe("completed");
  });
});
