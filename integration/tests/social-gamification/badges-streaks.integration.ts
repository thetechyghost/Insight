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
 * [FR-GM] Badges & Streaks
 *
 * Tests the badges and streaks subsystem:
 * - Badge listing and retrieval (platform-defined badges)
 * - User badge retrieval (own badges, other user's badges)
 * - Streak retrieval for the current user
 * - Freeze credit usage with ownership enforcement
 * - Tenant isolation on all operations
 * - Auth enforcement on all endpoints
 *
 * Note: awardBadge and updateStreak are internal mutations not directly
 * callable by clients. These tests verify the read paths and user-facing
 * mutations (useFreeze).
 */
describe("[FR-GM] Badges & Streaks", () => {
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

  // ==========================================================================
  // Badges
  // ==========================================================================

  describe("Badges", () => {
    // ---- Auth enforcement ----

    test("list rejects unauthenticated requests", async () => {
      await expectToThrow(
        () => unauthenticatedClient.query(api.badges.list, { tenantId: tenantId() }),
        "Not authenticated"
      );
    });

    test("getById rejects unauthenticated requests", async () => {
      await expectToThrow(
        () =>
          unauthenticatedClient.query(api.badges.getById, {
            tenantId: tenantId(),
            badgeId: ctx.tenants.cfAlpha.id as unknown as Id<"badges">,
          })
      );
    });

    test("getMyBadges rejects unauthenticated requests", async () => {
      await expectToThrow(
        () =>
          unauthenticatedClient.query(api.badges.getMyBadges, {
            tenantId: tenantId(),
          }),
        "Not authenticated"
      );
    });

    test("getUserBadges rejects unauthenticated requests", async () => {
      await expectToThrow(
        () =>
          unauthenticatedClient.query(api.badges.getUserBadges, {
            tenantId: tenantId(),
            userId: ctx.users.alice.id as Id<"users">,
          }),
        "Not authenticated"
      );
    });

    // ---- Badge listing ----

    test("authenticated user can list all badges", async () => {
      const client = await clientFor("dave");

      const badges = await client.query(api.badges.list, {
        tenantId: tenantId(),
      });

      expect(Array.isArray(badges)).toBe(true);
    });

    test("getById returns badge details", async () => {
      const client = await clientFor("dave");

      const badges = await client.query(api.badges.list, {
        tenantId: tenantId(),
      });

      if (badges.length > 0) {
        const badge = await client.query(api.badges.getById, {
          tenantId: tenantId(),
          badgeId: badges[0]._id,
        });

        expect(badge._id).toBe(badges[0]._id);
        expect(badge.name).toBe(badges[0].name);
        expect(badge.category).toBeDefined();
        expect(badge.description).toBeDefined();
      }
    });

    test("getById throws for non-existent badge", async () => {
      const client = await clientFor("dave");

      await expectToThrow(
        () =>
          client.query(api.badges.getById, {
            tenantId: tenantId(),
            badgeId: "invalid_id_here" as Id<"badges">,
          })
      );
    });

    // ---- User badges ----

    test("user can retrieve their own badges", async () => {
      const client = await clientFor("dave");

      const myBadges = await client.query(api.badges.getMyBadges, {
        tenantId: tenantId(),
      });

      expect(Array.isArray(myBadges)).toBe(true);
      // Each badge entry should have badge details
      for (const ub of myBadges) {
        expect(ub.userId).toBe(ctx.users.dave.id);
        expect(ub.tenantId).toBe(tenantId());
        expect(ub).toHaveProperty("badge");
      }
    });

    test("user can view another user's badges within the same tenant", async () => {
      const client = await clientFor("alice");

      const daveBadges = await client.query(api.badges.getUserBadges, {
        tenantId: tenantId(),
        userId: ctx.users.dave.id as Id<"users">,
      });

      expect(Array.isArray(daveBadges)).toBe(true);
      for (const ub of daveBadges) {
        expect(ub.userId).toBe(ctx.users.dave.id);
        expect(ub.tenantId).toBe(tenantId());
      }
    });

    // ---- Tenant isolation ----

    test("user cannot list badges from tenant they don't belong to", async () => {
      const client = await clientFor("dave");

      await expectToThrow(
        () =>
          client.query(api.badges.list, {
            tenantId: betaTenantId(),
          }),
        "not a member"
      );
    });

    test("user cannot view badges from another tenant", async () => {
      const client = await clientFor("dave");

      await expectToThrow(
        () =>
          client.query(api.badges.getMyBadges, {
            tenantId: betaTenantId(),
          }),
        "not a member"
      );
    });
  });

  // ==========================================================================
  // Streaks
  // ==========================================================================

  describe("Streaks", () => {
    // ---- Auth enforcement ----

    test("getMine rejects unauthenticated requests", async () => {
      await expectToThrow(
        () =>
          unauthenticatedClient.query(api.streaks.getMine, {
            tenantId: tenantId(),
          }),
        "Not authenticated"
      );
    });

    test("useFreeze rejects unauthenticated requests", async () => {
      await expectToThrow(
        () =>
          unauthenticatedClient.mutation(api.streaks.useFreeze, {
            tenantId: tenantId(),
            streakId: ctx.tenants.cfAlpha.id as unknown as Id<"streaks">,
          })
      );
    });

    // ---- Streak retrieval ----

    test("authenticated user can retrieve their streaks", async () => {
      const client = await clientFor("dave");

      const streaks = await client.query(api.streaks.getMine, {
        tenantId: tenantId(),
      });

      expect(Array.isArray(streaks)).toBe(true);
      for (const s of streaks) {
        expect(s.userId).toBe(ctx.users.dave.id);
        expect(s.tenantId).toBe(tenantId());
      }
    });

    // ---- Freeze credit usage ----

    test("useFreeze rejects for non-existent streak", async () => {
      const client = await clientFor("dave");

      await expectToThrow(
        () =>
          client.mutation(api.streaks.useFreeze, {
            tenantId: tenantId(),
            streakId: "invalid_id_here" as Id<"streaks">,
          })
      );
    });

    test("user cannot freeze a streak they don't own", async () => {
      // Get Alice's streaks and try to freeze one as Dave
      const aliceClient = await clientFor("alice");
      const aliceStreaks = await aliceClient.query(api.streaks.getMine, {
        tenantId: tenantId(),
      });

      if (aliceStreaks.length > 0) {
        const daveClient = await clientFor("dave");
        await expectToThrow(
          () =>
            daveClient.mutation(api.streaks.useFreeze, {
              tenantId: tenantId(),
              streakId: aliceStreaks[0]._id,
            }),
          "not found"
        );
      }
    });

    // ---- Tenant isolation ----

    test("user cannot retrieve streaks from tenant they don't belong to", async () => {
      const client = await clientFor("dave");

      await expectToThrow(
        () =>
          client.query(api.streaks.getMine, {
            tenantId: betaTenantId(),
          }),
        "not a member"
      );
    });

    test("user cannot use freeze on streak from another tenant", async () => {
      const client = await clientFor("dave");

      await expectToThrow(
        () =>
          client.mutation(api.streaks.useFreeze, {
            tenantId: betaTenantId(),
            streakId: ctx.tenants.cfAlpha.id as unknown as Id<"streaks">,
          })
      );
    });
  });
});
