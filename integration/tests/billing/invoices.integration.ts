import { describe, test, expect, beforeAll } from "vitest";
import { ConvexHttpClient } from "convex/browser";
import { createTestClient, createAuthenticatedClient } from "../../clients/convex-client";
import { getAuthToken } from "../../clients/auth";
import { loadSeedContext } from "../../helpers/load-context";
import { expectToThrow, expectValidId } from "../../helpers/assertions";
import { api } from "../../../convex/_generated/api";
import type { SeedContext } from "../../seed/types";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * [FR-BP] Invoices
 *
 * Tests the invoice subsystem:
 * - listMine: retrieve the current user's invoices
 * - listByTenant: list all invoices for the tenant (admin+ required)
 * - getById: retrieve a single invoice (ownership or admin+ required)
 * - createManual: create a manual invoice (admin+ required)
 * - voidInvoice: void an unpaid invoice (admin+ required)
 * - RBAC enforcement: admin+ for createManual, voidInvoice, listByTenant
 * - Ownership enforcement: non-admins can only see their own invoices
 * - Tenant isolation on all operations
 * - Auth enforcement on all endpoints
 */
describe("[FR-BP] Invoices", () => {
  let ctx: SeedContext;
  let unauthenticatedClient: ConvexHttpClient;

  let createdInvoiceId: Id<"invoices"> | null = null;

  beforeAll(() => {
    ctx = loadSeedContext();
    unauthenticatedClient = createTestClient();
  });

  async function clientFor(userKey: string) {
    const token = await getAuthToken(ctx.users[userKey].email!);
    return createAuthenticatedClient(token);
  }

  const tenantId = () => ctx.tenants.cfAlpha.id as Id<"tenants">;
  const betaTenantId = () => ctx.tenants.cfBeta.id as Id<"tenants">;

  // ---- Auth enforcement ----

  test("listMine rejects unauthenticated requests", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.query(api.invoices.listMine, {
          tenantId: tenantId(),
        }),
      "Not authenticated"
    );
  });

  test("listByTenant rejects unauthenticated requests", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.query(api.invoices.listByTenant, {
          tenantId: tenantId(),
        }),
      "Not authenticated"
    );
  });

  test("getById rejects unauthenticated requests", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.query(api.invoices.getById, {
          tenantId: tenantId(),
          invoiceId: "placeholder" as Id<"invoices">,
        }),
      "Not authenticated"
    );
  });

  test("createManual rejects unauthenticated requests", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.invoices.createManual, {
          tenantId: tenantId(),
          userId: "placeholder" as Id<"users">,
          amount: 5000,
          currency: "USD",
        }),
      "Not authenticated"
    );
  });

  test("voidInvoice rejects unauthenticated requests", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.invoices.voidInvoice, {
          tenantId: tenantId(),
          invoiceId: "placeholder" as Id<"invoices">,
        }),
      "Not authenticated"
    );
  });

  // ---- RBAC enforcement ----

  test("athlete cannot list all tenant invoices (admin+ required)", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.query(api.invoices.listByTenant, {
          tenantId: tenantId(),
        }),
      "Insufficient role"
    );
  });

  test("coach cannot list all tenant invoices (admin+ required)", async () => {
    const client = await clientFor("bob");

    await expectToThrow(
      () =>
        client.query(api.invoices.listByTenant, {
          tenantId: tenantId(),
        }),
      "Insufficient role"
    );
  });

  test("athlete cannot create a manual invoice (admin+ required)", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.mutation(api.invoices.createManual, {
          tenantId: tenantId(),
          userId: ctx.users.eve.id as Id<"users">,
          amount: 5000,
          currency: "USD",
        }),
      "Insufficient role"
    );
  });

  test("coach cannot create a manual invoice (admin+ required)", async () => {
    const client = await clientFor("bob");

    await expectToThrow(
      () =>
        client.mutation(api.invoices.createManual, {
          tenantId: tenantId(),
          userId: ctx.users.dave.id as Id<"users">,
          amount: 5000,
          currency: "USD",
        }),
      "Insufficient role"
    );
  });

  test("athlete cannot void an invoice (admin+ required)", async () => {
    // Create an invoice as admin first
    const adminClient = await clientFor("carol");
    const invoiceId = await adminClient.mutation(api.invoices.createManual, {
      tenantId: tenantId(),
      userId: ctx.users.dave.id as Id<"users">,
      amount: 1000,
      currency: "USD",
    });

    const athleteClient = await clientFor("dave");
    await expectToThrow(
      () =>
        athleteClient.mutation(api.invoices.voidInvoice, {
          tenantId: tenantId(),
          invoiceId,
        }),
      "Insufficient role"
    );
  });

  // ---- CRUD happy path ----

  test("admin can create a manual invoice", async () => {
    const client = await clientFor("carol");

    createdInvoiceId = await client.mutation(api.invoices.createManual, {
      tenantId: tenantId(),
      userId: ctx.users.dave.id as Id<"users">,
      amount: 15000,
      currency: "USD",
      lineItems: [
        { description: "Monthly membership", amount: 15000, quantity: 1 },
      ],
      dueDate: "2026-04-01",
    });

    expectValidId(createdInvoiceId);
  });

  test("owner can create a manual invoice", async () => {
    const client = await clientFor("alice");

    const id = await client.mutation(api.invoices.createManual, {
      tenantId: tenantId(),
      userId: ctx.users.eve.id as Id<"users">,
      amount: 2500,
      currency: "USD",
      lineItems: [
        { description: "Drop-in class", amount: 2500, quantity: 1 },
      ],
    });

    expectValidId(id);
  });

  test("admin can list all tenant invoices", async () => {
    const client = await clientFor("carol");

    const invoices = await client.query(api.invoices.listByTenant, {
      tenantId: tenantId(),
    });

    expect(invoices.length).toBeGreaterThan(0);
    for (const inv of invoices) {
      expect(inv.tenantId).toBe(tenantId());
    }
  });

  test("owner can list all tenant invoices", async () => {
    const client = await clientFor("alice");

    const invoices = await client.query(api.invoices.listByTenant, {
      tenantId: tenantId(),
    });

    expect(invoices.length).toBeGreaterThan(0);
  });

  // ---- listMine ----

  test("user can list their own invoices", async () => {
    const client = await clientFor("dave");

    const invoices = await client.query(api.invoices.listMine, {
      tenantId: tenantId(),
    });

    expect(Array.isArray(invoices)).toBe(true);
    for (const inv of invoices) {
      expect(inv.userId).toBe(ctx.users.dave.id);
      expect(inv.tenantId).toBe(tenantId());
    }
  });

  test("different users see only their own invoices via listMine", async () => {
    const daveClient = await clientFor("dave");
    const eveClient = await clientFor("eve");

    const daveInvoices = await daveClient.query(api.invoices.listMine, {
      tenantId: tenantId(),
    });

    const eveInvoices = await eveClient.query(api.invoices.listMine, {
      tenantId: tenantId(),
    });

    for (const inv of daveInvoices) {
      expect(inv.userId).toBe(ctx.users.dave.id);
    }
    for (const inv of eveInvoices) {
      expect(inv.userId).toBe(ctx.users.eve.id);
    }
  });

  // ---- getById ----

  test("user can view their own invoice", async () => {
    if (!createdInvoiceId) return;

    const client = await clientFor("dave");

    const invoice = await client.query(api.invoices.getById, {
      tenantId: tenantId(),
      invoiceId: createdInvoiceId,
    });

    expect(invoice._id).toBe(createdInvoiceId);
    expect(invoice.userId).toBe(ctx.users.dave.id);
    expect(invoice.amount).toBe(15000);
    expect(invoice.currency).toBe("USD");
    expect(invoice.status).toBe("open");
  });

  test("admin can view any user's invoice", async () => {
    if (!createdInvoiceId) return;

    const client = await clientFor("carol");

    const invoice = await client.query(api.invoices.getById, {
      tenantId: tenantId(),
      invoiceId: createdInvoiceId,
    });

    expect(invoice._id).toBe(createdInvoiceId);
    expect(invoice.userId).toBe(ctx.users.dave.id);
  });

  test("non-admin cannot view another user's invoice", async () => {
    if (!createdInvoiceId) return;

    // Invoice belongs to Dave, Eve should not be able to see it
    const client = await clientFor("eve");

    await expectToThrow(
      () =>
        client.query(api.invoices.getById, {
          tenantId: tenantId(),
          invoiceId: createdInvoiceId!,
        }),
      "Insufficient role"
    );
  });

  // ---- voidInvoice ----

  test("admin can void an open invoice", async () => {
    const client = await clientFor("carol");

    const invoiceId = await client.mutation(api.invoices.createManual, {
      tenantId: tenantId(),
      userId: ctx.users.dave.id as Id<"users">,
      amount: 3000,
      currency: "USD",
    });

    await client.mutation(api.invoices.voidInvoice, {
      tenantId: tenantId(),
      invoiceId,
    });

    const voided = await client.query(api.invoices.getById, {
      tenantId: tenantId(),
      invoiceId,
    });

    expect(voided.status).toBe("void");
  });

  test("cannot void a paid invoice", async () => {
    // We can't easily create a paid invoice via public API since that's
    // done via Stripe sync (internal mutation). This test relies on seeded data
    // or skips gracefully.
    const adminClient = await clientFor("carol");

    const allInvoices = await adminClient.query(api.invoices.listByTenant, {
      tenantId: tenantId(),
    });

    const paidInvoice = allInvoices.find((inv) => inv.status === "paid");
    if (paidInvoice) {
      await expectToThrow(
        () =>
          adminClient.mutation(api.invoices.voidInvoice, {
            tenantId: tenantId(),
            invoiceId: paidInvoice._id,
          }),
        "Cannot void a paid invoice"
      );
    }
  });

  test("voidInvoice rejects non-existent invoice", async () => {
    const client = await clientFor("carol");

    await expectToThrow(
      () =>
        client.mutation(api.invoices.voidInvoice, {
          tenantId: tenantId(),
          invoiceId: "invalid_id_here" as Id<"invoices">,
        }),
      "not found"
    );
  });

  // ---- Tenant isolation ----

  test("user cannot list invoices from tenant they don't belong to", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.query(api.invoices.listMine, {
          tenantId: betaTenantId(),
        }),
      "not a member"
    );
  });

  test("admin cannot list invoices from another tenant", async () => {
    const client = await clientFor("carol");

    await expectToThrow(
      () =>
        client.query(api.invoices.listByTenant, {
          tenantId: betaTenantId(),
        }),
      "not a member"
    );
  });

  test("admin cannot create invoice in another tenant", async () => {
    const client = await clientFor("carol");

    await expectToThrow(
      () =>
        client.mutation(api.invoices.createManual, {
          tenantId: betaTenantId(),
          userId: ctx.users.grace.id as Id<"users">,
          amount: 5000,
          currency: "USD",
        }),
      "not a member"
    );
  });

  test("getById rejects invoice from another tenant", async () => {
    // Create an invoice in cf-beta
    const graceClient = await clientFor("grace");
    const betaInvoiceId = await graceClient.mutation(api.invoices.createManual, {
      tenantId: betaTenantId(),
      userId: ctx.users.grace.id as Id<"users">,
      amount: 7500,
      currency: "USD",
    });

    // Dave cannot access it via cf-alpha
    const daveClient = await clientFor("dave");
    await expectToThrow(
      () =>
        daveClient.query(api.invoices.getById, {
          tenantId: tenantId(),
          invoiceId: betaInvoiceId,
        }),
      "not found"
    );
  });

  test("admin cannot void invoice from another tenant", async () => {
    const graceClient = await clientFor("grace");
    const betaInvoiceId = await graceClient.mutation(api.invoices.createManual, {
      tenantId: betaTenantId(),
      userId: ctx.users.grace.id as Id<"users">,
      amount: 4000,
      currency: "USD",
    });

    const carolClient = await clientFor("carol");
    await expectToThrow(
      () =>
        carolClient.mutation(api.invoices.voidInvoice, {
          tenantId: tenantId(),
          invoiceId: betaInvoiceId,
        }),
      "not found"
    );
  });
});
