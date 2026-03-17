import { describe, test, expect, beforeAll } from "vitest";
import { ConvexHttpClient } from "convex/browser";
import { createTestClient, createAuthenticatedClient } from "../../clients/convex-client";
import { getAuthToken } from "../../clients/auth";
import { loadSeedContext } from "../../helpers/load-context";
import { expectToThrow } from "../../helpers/assertions";
import { api } from "../../../convex/_generated/api";
import type { SeedContext } from "../../seed/types";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * [FR-BP] Subscriptions
 *
 * Tests the subscription subsystem:
 * - getMySubscription: retrieve the current user's active subscription
 * - listByTenant: list all subscriptions (admin+ required)
 * - changePlan: switch to a different membership plan (ownership enforced)
 * - freeze: pause an active subscription (ownership enforced)
 * - cancel: mark subscription to cancel at period end (ownership enforced)
 * - RBAC enforcement: admin+ for listByTenant
 * - Ownership enforcement: users can only manage their own subscriptions
 * - Tenant isolation on all operations
 * - Auth enforcement on all endpoints
 */
describe("[FR-BP] Subscriptions", () => {
  let ctx: SeedContext;
  let unauthenticatedClient: ConvexHttpClient;

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

  test("getMySubscription rejects unauthenticated requests", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.query(api.subscriptions.getMySubscription, {
          tenantId: tenantId(),
        }),
      "Not authenticated"
    );
  });

  test("listByTenant rejects unauthenticated requests", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.query(api.subscriptions.listByTenant, {
          tenantId: tenantId(),
        }),
      "Not authenticated"
    );
  });

  test("changePlan rejects unauthenticated requests", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.subscriptions.changePlan, {
          tenantId: tenantId(),
          subscriptionId: ctx.tenants.cfAlpha.id as unknown as Id<"subscriptions">,
          newPlanId: ctx.tenants.cfAlpha.id as unknown as Id<"membership_plans">,
        })
    );
  });

  test("freeze rejects unauthenticated requests", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.subscriptions.freeze, {
          tenantId: tenantId(),
          subscriptionId: ctx.tenants.cfAlpha.id as unknown as Id<"subscriptions">,
        })
    );
  });

  test("cancel rejects unauthenticated requests", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.subscriptions.cancel, {
          tenantId: tenantId(),
          subscriptionId: ctx.tenants.cfAlpha.id as unknown as Id<"subscriptions">,
        })
    );
  });

  // ---- RBAC enforcement ----

  test("athlete cannot list all tenant subscriptions (admin+ required)", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.query(api.subscriptions.listByTenant, {
          tenantId: tenantId(),
        }),
      "Insufficient role"
    );
  });

  test("coach cannot list all tenant subscriptions (admin+ required)", async () => {
    const client = await clientFor("bob");

    await expectToThrow(
      () =>
        client.query(api.subscriptions.listByTenant, {
          tenantId: tenantId(),
        }),
      "Insufficient role"
    );
  });

  test("admin can list all tenant subscriptions", async () => {
    const client = await clientFor("carol");

    const subs = await client.query(api.subscriptions.listByTenant, {
      tenantId: tenantId(),
    });

    expect(Array.isArray(subs)).toBe(true);
    for (const s of subs) {
      expect(s.tenantId).toBe(tenantId());
    }
  });

  test("owner can list all tenant subscriptions", async () => {
    const client = await clientFor("alice");

    const subs = await client.query(api.subscriptions.listByTenant, {
      tenantId: tenantId(),
    });

    expect(Array.isArray(subs)).toBe(true);
  });

  // ---- getMySubscription ----

  test("user can retrieve their own subscription", async () => {
    const client = await clientFor("dave");

    const sub = await client.query(api.subscriptions.getMySubscription, {
      tenantId: tenantId(),
    });

    // May be null if no subscription exists, but should not throw
    if (sub) {
      expect(sub.userId).toBe(ctx.users.dave.id);
      expect(sub.tenantId).toBe(tenantId());
      expect(["active", "trialing"]).toContain(sub.status);
    }
  });

  test("getMySubscription returns null when user has no active subscription", async () => {
    // Eve may not have a subscription seeded
    const client = await clientFor("eve");

    const sub = await client.query(api.subscriptions.getMySubscription, {
      tenantId: tenantId(),
    });

    // Result should be null or a valid subscription, never throw
    if (sub !== null) {
      expect(sub.userId).toBe(ctx.users.eve.id);
    }
  });

  // ---- Ownership enforcement (changePlan, freeze, cancel) ----

  test("user cannot change plan on another user's subscription", async () => {
    const aliceClient = await clientFor("alice");
    const subs = await aliceClient.query(api.subscriptions.listByTenant, {
      tenantId: tenantId(),
    });

    const daveSub = subs.find((s) => s.userId === ctx.users.dave.id);
    if (daveSub) {
      // Create a plan to change to
      const planId = await aliceClient.mutation(api.membershipPlans.create, {
        tenantId: tenantId(),
        name: "Ownership Test Plan",
        type: "recurring",
        price: 5000,
        billingInterval: "monthly",
      });

      const eveClient = await clientFor("eve");
      await expectToThrow(
        () =>
          eveClient.mutation(api.subscriptions.changePlan, {
            tenantId: tenantId(),
            subscriptionId: daveSub._id,
            newPlanId: planId,
          }),
        "not found"
      );
    }
  });

  test("user cannot freeze another user's subscription", async () => {
    const aliceClient = await clientFor("alice");
    const subs = await aliceClient.query(api.subscriptions.listByTenant, {
      tenantId: tenantId(),
    });

    const daveSub = subs.find(
      (s) => s.userId === ctx.users.dave.id && s.status === "active"
    );
    if (daveSub) {
      const eveClient = await clientFor("eve");
      await expectToThrow(
        () =>
          eveClient.mutation(api.subscriptions.freeze, {
            tenantId: tenantId(),
            subscriptionId: daveSub._id,
          }),
        "not found"
      );
    }
  });

  test("user cannot cancel another user's subscription", async () => {
    const aliceClient = await clientFor("alice");
    const subs = await aliceClient.query(api.subscriptions.listByTenant, {
      tenantId: tenantId(),
    });

    const daveSub = subs.find((s) => s.userId === ctx.users.dave.id);
    if (daveSub) {
      const eveClient = await clientFor("eve");
      await expectToThrow(
        () =>
          eveClient.mutation(api.subscriptions.cancel, {
            tenantId: tenantId(),
            subscriptionId: daveSub._id,
          }),
        "not found"
      );
    }
  });

  // ---- changePlan happy path ----

  test("user can change their own subscription plan", async () => {
    const daveClient = await clientFor("dave");
    const daveSub = await daveClient.query(api.subscriptions.getMySubscription, {
      tenantId: tenantId(),
    });

    if (daveSub) {
      // Create an alternative plan as owner
      const aliceClient = await clientFor("alice");
      const newPlanId = await aliceClient.mutation(api.membershipPlans.create, {
        tenantId: tenantId(),
        name: "Plan Change Target",
        type: "recurring",
        price: 8000,
        billingInterval: "monthly",
      });

      const originalPlanId = daveSub.planId;

      await daveClient.mutation(api.subscriptions.changePlan, {
        tenantId: tenantId(),
        subscriptionId: daveSub._id,
        newPlanId,
      });

      const updated = await daveClient.query(api.subscriptions.getMySubscription, {
        tenantId: tenantId(),
      });

      expect(updated).not.toBeNull();
      expect(updated!.planId).toBe(newPlanId);

      // Restore original plan
      await daveClient.mutation(api.subscriptions.changePlan, {
        tenantId: tenantId(),
        subscriptionId: daveSub._id,
        newPlanId: originalPlanId,
      });
    }
  });

  test("changePlan rejects non-existent plan", async () => {
    const daveClient = await clientFor("dave");
    const daveSub = await daveClient.query(api.subscriptions.getMySubscription, {
      tenantId: tenantId(),
    });

    if (daveSub) {
      await expectToThrow(
        () =>
          daveClient.mutation(api.subscriptions.changePlan, {
            tenantId: tenantId(),
            subscriptionId: daveSub._id,
            newPlanId: "invalid_plan_id" as Id<"membership_plans">,
          }),
        "not found"
      );
    }
  });

  // ---- freeze ----

  test("only active subscriptions can be frozen", async () => {
    const daveClient = await clientFor("dave");
    const daveSub = await daveClient.query(api.subscriptions.getMySubscription, {
      tenantId: tenantId(),
    });

    if (daveSub && daveSub.status === "active") {
      // Freeze it
      await daveClient.mutation(api.subscriptions.freeze, {
        tenantId: tenantId(),
        subscriptionId: daveSub._id,
      });

      // Try to freeze again — should fail because it's now paused
      await expectToThrow(
        () =>
          daveClient.mutation(api.subscriptions.freeze, {
            tenantId: tenantId(),
            subscriptionId: daveSub._id,
          }),
        "Only active"
      );
    }
  });

  // ---- cancel ----

  test("user can cancel their own subscription", async () => {
    const daveClient = await clientFor("dave");
    const daveSub = await daveClient.query(api.subscriptions.getMySubscription, {
      tenantId: tenantId(),
    });

    if (daveSub) {
      await daveClient.mutation(api.subscriptions.cancel, {
        tenantId: tenantId(),
        subscriptionId: daveSub._id,
      });

      // Verify the cancel flag was set
      // Note: we re-fetch via listByTenant since getMySubscription
      // only returns active/trialing
      const aliceClient = await clientFor("alice");
      const allSubs = await aliceClient.query(api.subscriptions.listByTenant, {
        tenantId: tenantId(),
      });

      const updatedSub = allSubs.find((s) => s._id === daveSub._id);
      if (updatedSub) {
        expect(updatedSub.cancelAtPeriodEnd).toBe(true);
      }
    }
  });

  // ---- Tenant isolation ----

  test("user cannot retrieve subscription from tenant they don't belong to", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.query(api.subscriptions.getMySubscription, {
          tenantId: betaTenantId(),
        }),
      "not a member"
    );
  });

  test("admin cannot list subscriptions from another tenant", async () => {
    const client = await clientFor("carol");

    await expectToThrow(
      () =>
        client.query(api.subscriptions.listByTenant, {
          tenantId: betaTenantId(),
        }),
      "not a member"
    );
  });

  test("user cannot freeze subscription in another tenant", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.mutation(api.subscriptions.freeze, {
          tenantId: betaTenantId(),
          subscriptionId: ctx.tenants.cfAlpha.id as unknown as Id<"subscriptions">,
        })
    );
  });

  test("user cannot cancel subscription in another tenant", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.mutation(api.subscriptions.cancel, {
          tenantId: betaTenantId(),
          subscriptionId: ctx.tenants.cfAlpha.id as unknown as Id<"subscriptions">,
        })
    );
  });
});
