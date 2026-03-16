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
 * [FR-CM] Notifications
 *
 * Tests the notification subsystem:
 * - listMine: retrieve in-app notifications for the current user
 * - markRead: mark a single notification as read
 * - markAllRead: mark all pending in-app notifications as read
 * - dismiss: delete a notification
 * - Ownership enforcement: users can only manage their own notifications
 * - Tenant isolation on all operations
 * - Auth enforcement on all endpoints
 *
 * Note: dispatch is an internal mutation used by the system to create
 * notifications. Tests rely on seeded notification data or the side-effects
 * of other operations that trigger notifications.
 */
describe("[FR-CM] Notifications", () => {
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

  test("listMine rejects unauthenticated requests", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.query(api.notifications.listMine, {
          tenantId: tenantId(),
        }),
      "Not authenticated"
    );
  });

  test("markRead rejects unauthenticated requests", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.notifications.markRead, {
          tenantId: tenantId(),
          notificationId: "placeholder" as Id<"notification_queue">,
        }),
      "Not authenticated"
    );
  });

  test("markAllRead rejects unauthenticated requests", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.notifications.markAllRead, {
          tenantId: tenantId(),
        }),
      "Not authenticated"
    );
  });

  test("dismiss rejects unauthenticated requests", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.notifications.dismiss, {
          tenantId: tenantId(),
          notificationId: "placeholder" as Id<"notification_queue">,
        }),
      "Not authenticated"
    );
  });

  // ---- List notifications ----

  test("authenticated user can list their notifications", async () => {
    const client = await clientFor("dave");

    const notifications = await client.query(api.notifications.listMine, {
      tenantId: tenantId(),
    });

    expect(Array.isArray(notifications)).toBe(true);
    // All returned notifications should be for the current user and in-app type
    for (const n of notifications) {
      expect(n.userId).toBe(ctx.users.dave.id);
      expect(n.type).toBe("in_app");
    }
  });

  test("different users see only their own notifications", async () => {
    const aliceClient = await clientFor("alice");
    const daveClient = await clientFor("dave");

    const aliceNotifs = await aliceClient.query(api.notifications.listMine, {
      tenantId: tenantId(),
    });

    const daveNotifs = await daveClient.query(api.notifications.listMine, {
      tenantId: tenantId(),
    });

    // Alice's notifications should not contain Dave's userId and vice versa
    for (const n of aliceNotifs) {
      expect(n.userId).toBe(ctx.users.alice.id);
    }
    for (const n of daveNotifs) {
      expect(n.userId).toBe(ctx.users.dave.id);
    }
  });

  // ---- Mark read ----

  test("user can mark their own notification as read", async () => {
    const client = await clientFor("dave");

    const notifications = await client.query(api.notifications.listMine, {
      tenantId: tenantId(),
    });

    const pending = notifications.find((n) => n.status === "pending");
    if (pending) {
      await client.mutation(api.notifications.markRead, {
        tenantId: tenantId(),
        notificationId: pending._id,
      });

      // Verify it's now read
      const updated = await client.query(api.notifications.listMine, {
        tenantId: tenantId(),
      });
      const found = updated.find((n) => n._id === pending._id);
      if (found) {
        expect(found.status).toBe("read");
      }
    }
  });

  test("user cannot mark another user's notification as read", async () => {
    const aliceClient = await clientFor("alice");
    const aliceNotifs = await aliceClient.query(api.notifications.listMine, {
      tenantId: tenantId(),
    });

    if (aliceNotifs.length > 0) {
      const daveClient = await clientFor("dave");
      await expectToThrow(
        () =>
          daveClient.mutation(api.notifications.markRead, {
            tenantId: tenantId(),
            notificationId: aliceNotifs[0]._id,
          }),
        "not found"
      );
    }
  });

  // ---- Mark all read ----

  test("markAllRead marks all pending in-app notifications as read", async () => {
    const client = await clientFor("alice");

    await client.mutation(api.notifications.markAllRead, {
      tenantId: tenantId(),
    });

    const notifications = await client.query(api.notifications.listMine, {
      tenantId: tenantId(),
    });

    // All in-app notifications should now be read (none pending)
    for (const n of notifications) {
      expect(n.status).not.toBe("pending");
    }
  });

  // ---- Dismiss ----

  test("user can dismiss their own notification", async () => {
    const client = await clientFor("dave");

    const notifications = await client.query(api.notifications.listMine, {
      tenantId: tenantId(),
    });

    if (notifications.length > 0) {
      const targetId = notifications[0]._id;

      await client.mutation(api.notifications.dismiss, {
        tenantId: tenantId(),
        notificationId: targetId,
      });

      // Verify it's gone
      const updated = await client.query(api.notifications.listMine, {
        tenantId: tenantId(),
      });
      const found = updated.find((n) => n._id === targetId);
      expect(found).toBeUndefined();
    }
  });

  test("user cannot dismiss another user's notification", async () => {
    const aliceClient = await clientFor("alice");
    const aliceNotifs = await aliceClient.query(api.notifications.listMine, {
      tenantId: tenantId(),
    });

    if (aliceNotifs.length > 0) {
      const daveClient = await clientFor("dave");
      await expectToThrow(
        () =>
          daveClient.mutation(api.notifications.dismiss, {
            tenantId: tenantId(),
            notificationId: aliceNotifs[0]._id,
          }),
        "not found"
      );
    }
  });

  // ---- Tenant isolation ----

  test("user cannot list notifications from tenant they don't belong to", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.query(api.notifications.listMine, {
          tenantId: betaTenantId(),
        }),
      "not a member"
    );
  });

  test("user cannot mark notifications as read in another tenant", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.mutation(api.notifications.markAllRead, {
          tenantId: betaTenantId(),
        }),
      "not a member"
    );
  });

  test("user cannot dismiss notifications in another tenant", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.mutation(api.notifications.dismiss, {
          tenantId: betaTenantId(),
          notificationId: "placeholder" as Id<"notification_queue">,
        }),
      "not a member"
    );
  });
});
