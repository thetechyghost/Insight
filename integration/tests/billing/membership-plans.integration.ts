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
 * [FR-BP] Membership Plans
 *
 * Tests the membership plan subsystem:
 * - CRUD lifecycle: create, list, getById, update, deactivate
 * - RBAC enforcement: owner+ required for create/update/deactivate
 * - All authenticated users can read plans
 * - Filtering by active status
 * - Tenant isolation on all operations
 * - Auth enforcement on all endpoints
 */
describe("[FR-BP] Membership Plans", () => {
  let ctx: SeedContext;
  let unauthenticatedClient: ConvexHttpClient;

  let createdPlanId: Id<"membership_plans"> | null = null;

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

  test("list rejects unauthenticated requests", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.query(api.membershipPlans.list, {
          tenantId: tenantId(),
        }),
      "Not authenticated"
    );
  });

  test("create rejects unauthenticated requests", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.membershipPlans.create, {
          tenantId: tenantId(),
          name: "Hack Plan",
          type: "recurring",
          price: 0,
        }),
      "Not authenticated"
    );
  });

  test("getById rejects unauthenticated requests", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.query(api.membershipPlans.getById, {
          tenantId: tenantId(),
          planId: ctx.tenants.cfAlpha.id as unknown as Id<"membership_plans">,
        })
    );
  });

  test("update rejects unauthenticated requests", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.membershipPlans.update, {
          tenantId: tenantId(),
          planId: ctx.tenants.cfAlpha.id as unknown as Id<"membership_plans">,
          name: "Hacked",
        })
    );
  });

  test("deactivate rejects unauthenticated requests", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.membershipPlans.deactivate, {
          tenantId: tenantId(),
          planId: ctx.tenants.cfAlpha.id as unknown as Id<"membership_plans">,
        })
    );
  });

  // ---- RBAC enforcement ----

  test("athlete cannot create a membership plan (owner+ required)", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.mutation(api.membershipPlans.create, {
          tenantId: tenantId(),
          name: "Dave's Plan",
          type: "recurring",
          price: 100,
        }),
      "Insufficient role"
    );
  });

  test("coach cannot create a membership plan (owner+ required)", async () => {
    const client = await clientFor("bob");

    await expectToThrow(
      () =>
        client.mutation(api.membershipPlans.create, {
          tenantId: tenantId(),
          name: "Bob's Plan",
          type: "recurring",
          price: 100,
        }),
      "Insufficient role"
    );
  });

  test("admin cannot create a membership plan (owner+ required)", async () => {
    const client = await clientFor("carol");

    await expectToThrow(
      () =>
        client.mutation(api.membershipPlans.create, {
          tenantId: tenantId(),
          name: "Carol's Plan",
          type: "recurring",
          price: 100,
        }),
      "Insufficient role"
    );
  });

  test("athlete cannot update a membership plan (owner+ required)", async () => {
    // Create one as owner first
    const ownerClient = await clientFor("alice");
    const planId = await ownerClient.mutation(api.membershipPlans.create, {
      tenantId: tenantId(),
      name: "RBAC Update Test Plan",
      type: "drop_in",
      price: 25,
    });

    const athleteClient = await clientFor("dave");
    await expectToThrow(
      () =>
        athleteClient.mutation(api.membershipPlans.update, {
          tenantId: tenantId(),
          planId,
          name: "Hacked Name",
        }),
      "Insufficient role"
    );
  });

  test("coach cannot deactivate a membership plan (owner+ required)", async () => {
    const ownerClient = await clientFor("alice");
    const planId = await ownerClient.mutation(api.membershipPlans.create, {
      tenantId: tenantId(),
      name: "RBAC Deactivate Test Plan",
      type: "trial",
      price: 0,
      trialDays: 14,
    });

    const coachClient = await clientFor("bob");
    await expectToThrow(
      () =>
        coachClient.mutation(api.membershipPlans.deactivate, {
          tenantId: tenantId(),
          planId,
        }),
      "Insufficient role"
    );
  });

  // ---- CRUD happy path ----

  test("owner can create a recurring membership plan", async () => {
    const client = await clientFor("alice");

    createdPlanId = await client.mutation(api.membershipPlans.create, {
      tenantId: tenantId(),
      name: "Unlimited Monthly",
      type: "recurring",
      price: 15000, // $150.00 in cents
      currency: "USD",
      billingInterval: "monthly",
      classesPerWeek: 5,
      features: ["Unlimited classes", "Open gym access", "Mobility clinic"],
      cancellationTerms: "30-day notice required",
    });

    expectValidId(createdPlanId);
  });

  test("owner can create a punch card plan", async () => {
    const client = await clientFor("alice");

    const id = await client.mutation(api.membershipPlans.create, {
      tenantId: tenantId(),
      name: "10-Class Pack",
      type: "punch_card",
      price: 18000,
      currency: "USD",
      includedClassesPerPeriod: 10,
    });

    expectValidId(id);
  });

  test("owner can create a drop-in plan", async () => {
    const client = await clientFor("alice");

    const id = await client.mutation(api.membershipPlans.create, {
      tenantId: tenantId(),
      name: "Single Drop-In",
      type: "drop_in",
      price: 2500,
      currency: "USD",
    });

    expectValidId(id);
  });

  test("owner can create a trial plan", async () => {
    const client = await clientFor("alice");

    const id = await client.mutation(api.membershipPlans.create, {
      tenantId: tenantId(),
      name: "Free Trial",
      type: "trial",
      price: 0,
      trialDays: 7,
    });

    expectValidId(id);
  });

  test("list returns all plans for the tenant", async () => {
    const client = await clientFor("dave");

    const plans = await client.query(api.membershipPlans.list, {
      tenantId: tenantId(),
    });

    expect(plans.length).toBeGreaterThan(0);
    for (const p of plans) {
      expect(p.tenantId).toBe(tenantId());
    }
  });

  test("athlete can read plans (no RBAC restriction on reads)", async () => {
    const client = await clientFor("dave");

    const plans = await client.query(api.membershipPlans.list, {
      tenantId: tenantId(),
    });

    expect(Array.isArray(plans)).toBe(true);
  });

  test("list supports activeOnly filter", async () => {
    const client = await clientFor("dave");

    const activePlans = await client.query(api.membershipPlans.list, {
      tenantId: tenantId(),
      activeOnly: true,
    });

    for (const p of activePlans) {
      expect(p.isActive).toBe(true);
    }
  });

  test("getById returns plan details", async () => {
    if (!createdPlanId) return;

    const client = await clientFor("dave");

    const plan = await client.query(api.membershipPlans.getById, {
      tenantId: tenantId(),
      planId: createdPlanId,
    });

    expect(plan._id).toBe(createdPlanId);
    expect(plan.name).toBe("Unlimited Monthly");
    expect(plan.type).toBe("recurring");
    expect(plan.price).toBe(15000);
    expect(plan.billingInterval).toBe("monthly");
    expect(plan.isActive).toBe(true);
    expect(plan.features).toContain("Unlimited classes");
  });

  test("owner can update a membership plan", async () => {
    if (!createdPlanId) return;

    const client = await clientFor("alice");

    await client.mutation(api.membershipPlans.update, {
      tenantId: tenantId(),
      planId: createdPlanId,
      name: "Unlimited Monthly (Updated)",
      price: 16000,
      features: ["Unlimited classes", "Open gym access", "Mobility clinic", "Sauna"],
    });

    const updated = await client.query(api.membershipPlans.getById, {
      tenantId: tenantId(),
      planId: createdPlanId,
    });

    expect(updated.name).toBe("Unlimited Monthly (Updated)");
    expect(updated.price).toBe(16000);
    expect(updated.features).toContain("Sauna");
  });

  test("owner can deactivate a membership plan", async () => {
    const client = await clientFor("alice");

    // Create a plan specifically for deactivation
    const planId = await client.mutation(api.membershipPlans.create, {
      tenantId: tenantId(),
      name: "Deactivation Test Plan",
      type: "drop_in",
      price: 3000,
    });

    await client.mutation(api.membershipPlans.deactivate, {
      tenantId: tenantId(),
      planId,
    });

    const deactivated = await client.query(api.membershipPlans.getById, {
      tenantId: tenantId(),
      planId,
    });

    expect(deactivated.isActive).toBe(false);
  });

  test("deactivated plan does not appear in activeOnly list", async () => {
    const client = await clientFor("alice");

    const planId = await client.mutation(api.membershipPlans.create, {
      tenantId: tenantId(),
      name: "Hidden Plan",
      type: "recurring",
      price: 5000,
      billingInterval: "monthly",
    });

    await client.mutation(api.membershipPlans.deactivate, {
      tenantId: tenantId(),
      planId,
    });

    const activePlans = await client.query(api.membershipPlans.list, {
      tenantId: tenantId(),
      activeOnly: true,
    });

    const found = activePlans.find((p) => p._id === planId);
    expect(found).toBeUndefined();
  });

  // ---- Tenant isolation ----

  test("user cannot list plans from tenant they don't belong to", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.query(api.membershipPlans.list, {
          tenantId: betaTenantId(),
        }),
      "not a member"
    );
  });

  test("getById rejects plan from another tenant", async () => {
    // Create a plan in cf-beta
    const graceClient = await clientFor("grace");
    const betaPlanId = await graceClient.mutation(api.membershipPlans.create, {
      tenantId: betaTenantId(),
      name: "Beta Exclusive Plan",
      type: "recurring",
      price: 12000,
      billingInterval: "monthly",
    });

    // Dave cannot access it via cf-alpha
    const daveClient = await clientFor("dave");
    await expectToThrow(
      () =>
        daveClient.query(api.membershipPlans.getById, {
          tenantId: tenantId(),
          planId: betaPlanId,
        }),
      "not found"
    );
  });

  test("owner of tenant A cannot create plans in tenant B", async () => {
    const client = await clientFor("alice");

    await expectToThrow(
      () =>
        client.mutation(api.membershipPlans.create, {
          tenantId: betaTenantId(),
          name: "Cross-Tenant Plan",
          type: "recurring",
          price: 10000,
        }),
      "not a member"
    );
  });
});
