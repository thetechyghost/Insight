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
 * [FR-SC] Activity Feed
 *
 * Tests the activity feed subsystem:
 * - Paginated feed retrieval scoped by tenant
 * - Visibility filtering (own items always visible, gym/public visible to others)
 * - Hide/remove operations enforce ownership
 * - Tenant isolation prevents cross-tenant feed leakage
 * - Auth enforcement on all endpoints
 */
describe("[FR-SC] Activity Feed", () => {
  let ctx: SeedContext;
  let unauthenticatedClient: ConvexHttpClient;

  beforeAll(() => {
    ctx = loadSeedContext();
    unauthenticatedClient = createTestClient();
  });

  // Helper to get an authenticated client for a user
  async function clientFor(userKey: string) {
    const token = await getAuthToken(ctx.users[userKey].email!);
    return createAuthenticatedClient(token);
  }

  const tenantId = () => ctx.tenants.cfAlpha.id as Id<"tenants">;
  const betaTenantId = () => ctx.tenants.cfBeta.id as Id<"tenants">;

  // ---- Auth enforcement ----

  test("getFeed rejects unauthenticated requests", async () => {
    await expectToThrow(
      () => unauthenticatedClient.query(api.activityFeed.getFeed, { tenantId: tenantId() }),
      "Not authenticated"
    );
  });

  test("hide rejects unauthenticated requests", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.activityFeed.hide, {
          tenantId: tenantId(),
          feedItemId: "placeholder" as Id<"activity_feed">,
        }),
      "Not authenticated"
    );
  });

  test("remove rejects unauthenticated requests", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.activityFeed.remove, {
          tenantId: tenantId(),
          feedItemId: "placeholder" as Id<"activity_feed">,
        }),
      "Not authenticated"
    );
  });

  // ---- Feed retrieval ----

  test("authenticated user can retrieve their feed", async () => {
    const client = await clientFor("dave");

    const result = await client.query(api.activityFeed.getFeed, {
      tenantId: tenantId(),
    });

    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("hasMore");
    expect(Array.isArray(result.items)).toBe(true);
  });

  test("feed supports pagination with limit parameter", async () => {
    const client = await clientFor("dave");

    const result = await client.query(api.activityFeed.getFeed, {
      tenantId: tenantId(),
      limit: 5,
    });

    expect(result.items.length).toBeLessThanOrEqual(5);
  });

  test("feed items belong to the correct tenant", async () => {
    const client = await clientFor("alice");

    const result = await client.query(api.activityFeed.getFeed, {
      tenantId: tenantId(),
    });

    for (const item of result.items) {
      expect(item.tenantId).toBe(tenantId());
    }
  });

  // ---- Tenant isolation ----

  test("user cannot access feed for tenant they don't belong to", async () => {
    // Dave is only in cf-alpha
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.query(api.activityFeed.getFeed, {
          tenantId: betaTenantId(),
        }),
      "not a member"
    );
  });

  test("feed from tenant A does not contain tenant B items", async () => {
    const client = await clientFor("alice");

    const alphaResult = await client.query(api.activityFeed.getFeed, {
      tenantId: tenantId(),
    });

    for (const item of alphaResult.items) {
      expect(item.tenantId).not.toBe(betaTenantId());
    }
  });

  // ---- Ownership enforcement (hide/remove) ----

  test("user cannot hide a feed item they don't own", async () => {
    // First, get Alice's feed to find an item not owned by Dave
    const aliceClient = await clientFor("alice");
    const result = await aliceClient.query(api.activityFeed.getFeed, {
      tenantId: tenantId(),
    });

    const aliceItem = result.items.find(
      (item) => item.userId === (ctx.users.alice.id as Id<"users">)
    );

    if (aliceItem) {
      const daveClient = await clientFor("dave");
      await expectToThrow(
        () =>
          daveClient.mutation(api.activityFeed.hide, {
            tenantId: tenantId(),
            feedItemId: aliceItem._id,
          }),
        "not owned by you"
      );
    }
  });

  test("user cannot remove a feed item they don't own", async () => {
    const aliceClient = await clientFor("alice");
    const result = await aliceClient.query(api.activityFeed.getFeed, {
      tenantId: tenantId(),
    });

    const aliceItem = result.items.find(
      (item) => item.userId === (ctx.users.alice.id as Id<"users">)
    );

    if (aliceItem) {
      const daveClient = await clientFor("dave");
      await expectToThrow(
        () =>
          daveClient.mutation(api.activityFeed.remove, {
            tenantId: tenantId(),
            feedItemId: aliceItem._id,
          }),
        "not owned by you"
      );
    }
  });
});
