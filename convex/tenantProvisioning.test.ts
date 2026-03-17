import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

describe("tenantProvisioning", () => {
  test("create produces a pending provisioning record with a new tenant", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    const { provisioningId, tenantId } = await asAdmin.mutation(
      api.tenantProvisioning.create,
      {
        tenantName: "New Gym",
        tenantSlug: "new-gym",
        contactEmail: "contact@newgym.com",
      }
    );

    const prov = await t.run(async (ctx) => ctx.db.get(provisioningId));
    expect(prov!.status).toBe("pending");
    expect(prov!.tenantId).toBe(tenantId);

    const tenant = await t.run(async (ctx) => ctx.db.get(tenantId));
    expect(tenant!.name).toBe("New Gym");
    expect(tenant!.slug).toBe("new-gym");
  });

  test("create rejects duplicate slug", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      await ctx.db.insert("tenants", { name: "Existing", slug: "taken" });
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    await expect(
      asAdmin.mutation(api.tenantProvisioning.create, {
        tenantName: "Another",
        tenantSlug: "taken",
        contactEmail: "a@b.com",
      })
    ).rejects.toThrow("Slug already in use");
  });

  test("approve transitions pending to approved", async () => {
    const t = convexTest(schema);

    const provisioningId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      return await ctx.db.insert("tenant_provisioning", {
        requestedBy: userId,
        status: "pending",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    await asAdmin.mutation(api.tenantProvisioning.approve, { provisioningId });

    const record = await t.run(async (ctx) => ctx.db.get(provisioningId));
    expect(record!.status).toBe("approved");
  });

  test("approve rejects non-pending record", async () => {
    const t = convexTest(schema);

    const provisioningId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      return await ctx.db.insert("tenant_provisioning", {
        requestedBy: userId,
        status: "approved",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    await expect(
      asAdmin.mutation(api.tenantProvisioning.approve, { provisioningId })
    ).rejects.toThrow("Only pending requests can be approved");
  });

  test("activate transitions approved to active", async () => {
    const t = convexTest(schema);

    const provisioningId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      return await ctx.db.insert("tenant_provisioning", {
        requestedBy: userId,
        status: "approved",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    await asAdmin.mutation(api.tenantProvisioning.activate, { provisioningId });

    const record = await t.run(async (ctx) => ctx.db.get(provisioningId));
    expect(record!.status).toBe("active");
  });

  test("activate rejects non-approved record", async () => {
    const t = convexTest(schema);

    const provisioningId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      return await ctx.db.insert("tenant_provisioning", {
        requestedBy: userId,
        status: "pending",
      });
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    await expect(
      asAdmin.mutation(api.tenantProvisioning.activate, { provisioningId })
    ).rejects.toThrow("Only approved requests can be activated");
  });

  test("list returns all provisioning records", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      await ctx.db.insert("tenant_provisioning", { requestedBy: userId, status: "pending" });
      await ctx.db.insert("tenant_provisioning", { requestedBy: userId, status: "active" });
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    const all = await asAdmin.query(api.tenantProvisioning.list, {});
    expect(all).toHaveLength(2);
  });

  test("list filters by status", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Admin", email: "admin@test.com" });
      await ctx.db.insert("tenant_provisioning", { requestedBy: userId, status: "pending" });
      await ctx.db.insert("tenant_provisioning", { requestedBy: userId, status: "active" });
    });

    const asAdmin = t.withIdentity({ email: "admin@test.com", subject: "user|admin" });
    const pending = await asAdmin.query(api.tenantProvisioning.list, { status: "pending" });
    expect(pending).toHaveLength(1);
    expect(pending[0].status).toBe("pending");
  });

  test("create rejects unauthenticated request", async () => {
    const t = convexTest(schema);
    await expect(
      t.mutation(api.tenantProvisioning.create, {
        tenantName: "Test",
        tenantSlug: "test",
        contactEmail: "a@b.com",
      })
    ).rejects.toThrow();
  });
});
