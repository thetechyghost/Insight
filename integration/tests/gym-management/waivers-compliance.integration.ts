import { describe, test, expect, beforeAll } from "vitest";
import { ConvexHttpClient } from "convex/browser";
import { createAuthenticatedClient, createTestClient } from "../../clients/convex-client";
import { getAuthToken } from "../../clients/auth";
import { loadSeedContext } from "../../helpers/load-context";
import { expectToThrow, expectValidId } from "../../helpers/assertions";
import { api } from "../../../convex/_generated/api";
import type { SeedContext } from "../../seed/types";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * [FR-CS, FR-TG] Waivers & Compliance
 *
 * Tests the waiver lifecycle: create, version (update), sign, and
 * signature status checks. Covers RBAC enforcement (owner+ for
 * create/update, any member for sign/view), and tenant isolation.
 */
describe("[FR-CS, FR-TG] Waivers & Compliance", () => {
  let ctx: SeedContext;
  let createdWaiverId: Id<"waivers"> | null = null;
  let updatedWaiverId: Id<"waivers"> | null = null;

  beforeAll(() => {
    ctx = loadSeedContext();
  });

  // Helper to get an authenticated client for a user
  async function clientFor(userKey: string): Promise<ConvexHttpClient> {
    const token = await getAuthToken(ctx.users[userKey].email!);
    return createAuthenticatedClient(token);
  }

  const tenantId = () => ctx.tenants.cfAlpha.id as Id<"tenants">;
  const betaTenantId = () => ctx.tenants.cfBeta.id as Id<"tenants">;

  // ==========================================================================
  // create — owner+ required
  // ==========================================================================

  describe("create", () => {
    test("owner can create a waiver", async () => {
      const client = await clientFor("alice");

      const waiverId = await client.mutation(api.waivers.create, {
        tenantId: tenantId(),
        title: "Liability Waiver",
        content: "By signing this waiver, you acknowledge the risks associated with CrossFit training...",
      });

      expectValidId(waiverId);
      createdWaiverId = waiverId as Id<"waivers">;
    });

    test("admin cannot create waivers (owner+ required)", async () => {
      const client = await clientFor("carol");

      await expectToThrow(
        () =>
          client.mutation(api.waivers.create, {
            tenantId: tenantId(),
            title: "Admin Waiver",
            content: "This should not be created.",
          }),
        "Insufficient role"
      );
    });

    test("coach cannot create waivers (owner+ required)", async () => {
      const client = await clientFor("bob");

      await expectToThrow(
        () =>
          client.mutation(api.waivers.create, {
            tenantId: tenantId(),
            title: "Coach Waiver",
            content: "This should not be created.",
          }),
        "Insufficient role"
      );
    });

    test("athlete cannot create waivers (owner+ required)", async () => {
      const client = await clientFor("dave");

      await expectToThrow(
        () =>
          client.mutation(api.waivers.create, {
            tenantId: tenantId(),
            title: "Athlete Waiver",
            content: "This should not be created.",
          }),
        "Insufficient role"
      );
    });

    test("unauthenticated user cannot create waivers", async () => {
      const client = createTestClient();

      await expectToThrow(() =>
        client.mutation(api.waivers.create, {
          tenantId: tenantId(),
          title: "Unauth Waiver",
          content: "This should not be created.",
        })
      );
    });
  });

  // ==========================================================================
  // listActive — any tenant member
  // ==========================================================================

  describe("listActive", () => {
    test("athlete can list active waivers", async () => {
      const client = await clientFor("dave");

      const waivers = await client.query(api.waivers.listActive, {
        tenantId: tenantId(),
      });

      expect(Array.isArray(waivers)).toBe(true);
      // All returned waivers should be active and belong to this tenant
      for (const w of waivers) {
        expect(w.isActive).toBe(true);
        expect(w.tenantId).toBe(ctx.tenants.cfAlpha.id);
      }
    });

    test("coach can list active waivers", async () => {
      const client = await clientFor("bob");

      const waivers = await client.query(api.waivers.listActive, {
        tenantId: tenantId(),
      });

      expect(Array.isArray(waivers)).toBe(true);
    });

    test("admin can list active waivers", async () => {
      const client = await clientFor("carol");

      const waivers = await client.query(api.waivers.listActive, {
        tenantId: tenantId(),
      });

      expect(Array.isArray(waivers)).toBe(true);
    });

    test("owner can list active waivers", async () => {
      const client = await clientFor("alice");

      const waivers = await client.query(api.waivers.listActive, {
        tenantId: tenantId(),
      });

      expect(Array.isArray(waivers)).toBe(true);
      // Should include our created waiver
      if (createdWaiverId) {
        const found = waivers.some((w: any) => w._id === createdWaiverId);
        expect(found).toBe(true);
      }
    });

    test("created waiver has correct initial properties", async () => {
      if (!createdWaiverId) return;

      const client = await clientFor("alice");
      const waivers = await client.query(api.waivers.listActive, {
        tenantId: tenantId(),
      });

      const waiver = waivers.find((w: any) => w._id === createdWaiverId);
      expect(waiver).toBeDefined();
      expect(waiver!.title).toBe("Liability Waiver");
      expect(waiver!.version).toBe(1);
      expect(waiver!.isActive).toBe(true);
    });

    test("tenant isolation: cannot list waivers for a tenant you don't belong to", async () => {
      // Dave is only in cf-alpha
      const client = await clientFor("dave");

      await expectToThrow(
        () =>
          client.query(api.waivers.listActive, {
            tenantId: betaTenantId(),
          }),
        "not a member"
      );
    });

    test("unauthenticated user cannot list waivers", async () => {
      const client = createTestClient();

      await expectToThrow(() =>
        client.query(api.waivers.listActive, {
          tenantId: tenantId(),
        })
      );
    });
  });

  // ==========================================================================
  // update (versioning) — owner+ required
  // ==========================================================================

  describe("update (versioning)", () => {
    test("owner can update a waiver (creates new version, deactivates old)", async () => {
      if (!createdWaiverId) return;

      const client = await clientFor("alice");

      const newWaiverId = await client.mutation(api.waivers.update, {
        tenantId: tenantId(),
        waiverId: createdWaiverId,
        title: "Liability Waiver v2",
        content: "Updated waiver content with additional clauses...",
      });

      expectValidId(newWaiverId);
      updatedWaiverId = newWaiverId as Id<"waivers">;

      // Verify the new waiver is active with incremented version
      const waivers = await client.query(api.waivers.listActive, {
        tenantId: tenantId(),
      });

      const newWaiver = waivers.find((w: any) => w._id === updatedWaiverId);
      expect(newWaiver).toBeDefined();
      expect(newWaiver!.title).toBe("Liability Waiver v2");
      expect(newWaiver!.version).toBe(2);
      expect(newWaiver!.isActive).toBe(true);

      // Old waiver should no longer appear in active list
      const oldWaiver = waivers.find((w: any) => w._id === createdWaiverId);
      expect(oldWaiver).toBeUndefined();
    });

    test("admin cannot update waivers (owner+ required)", async () => {
      if (!updatedWaiverId) return;

      const client = await clientFor("carol");

      await expectToThrow(
        () =>
          client.mutation(api.waivers.update, {
            tenantId: tenantId(),
            waiverId: updatedWaiverId!,
            title: "Admin Updated Waiver",
            content: "Should not work.",
          }),
        "Insufficient role"
      );
    });

    test("coach cannot update waivers (owner+ required)", async () => {
      if (!updatedWaiverId) return;

      const client = await clientFor("bob");

      await expectToThrow(
        () =>
          client.mutation(api.waivers.update, {
            tenantId: tenantId(),
            waiverId: updatedWaiverId!,
            title: "Coach Updated Waiver",
            content: "Should not work.",
          }),
        "Insufficient role"
      );
    });

    test("athlete cannot update waivers (owner+ required)", async () => {
      if (!updatedWaiverId) return;

      const client = await clientFor("dave");

      await expectToThrow(
        () =>
          client.mutation(api.waivers.update, {
            tenantId: tenantId(),
            waiverId: updatedWaiverId!,
            title: "Athlete Updated Waiver",
            content: "Should not work.",
          }),
        "Insufficient role"
      );
    });

    test("tenant isolation: cannot update waiver from another tenant", async () => {
      // Create a waiver in cf-beta
      const graceClient = await clientFor("grace");
      const betaWaiverId = (await graceClient.mutation(api.waivers.create, {
        tenantId: betaTenantId(),
        title: "Beta Gym Waiver",
        content: "Waiver for CrossFit Beta.",
      })) as Id<"waivers">;

      // Alice (cf-alpha owner) tries to update cf-beta's waiver
      const aliceClient = await clientFor("alice");

      await expectToThrow(
        () =>
          aliceClient.mutation(api.waivers.update, {
            tenantId: tenantId(),
            waiverId: betaWaiverId,
            title: "Hijacked Waiver",
            content: "Should not work.",
          }),
        "not found"
      );
    });
  });

  // ==========================================================================
  // sign — any tenant member
  // ==========================================================================

  describe("sign", () => {
    test("athlete can sign an active waiver", async () => {
      if (!updatedWaiverId) return;

      const client = await clientFor("dave");

      const signatureId = await client.mutation(api.waivers.sign, {
        tenantId: tenantId(),
        waiverId: updatedWaiverId,
      });

      expectValidId(signatureId);
    });

    test("coach can sign an active waiver", async () => {
      if (!updatedWaiverId) return;

      const client = await clientFor("bob");

      const signatureId = await client.mutation(api.waivers.sign, {
        tenantId: tenantId(),
        waiverId: updatedWaiverId,
      });

      expectValidId(signatureId);
    });

    test("cannot sign the same waiver twice", async () => {
      if (!updatedWaiverId) return;

      const client = await clientFor("dave");

      await expectToThrow(
        () =>
          client.mutation(api.waivers.sign, {
            tenantId: tenantId(),
            waiverId: updatedWaiverId!,
          }),
        "already signed"
      );
    });

    test("cannot sign an inactive (old version) waiver", async () => {
      if (!createdWaiverId) return;

      const client = await clientFor("eve");

      await expectToThrow(
        () =>
          client.mutation(api.waivers.sign, {
            tenantId: tenantId(),
            waiverId: createdWaiverId!,
          }),
        "no longer active"
      );
    });

    test("unauthenticated user cannot sign a waiver", async () => {
      if (!updatedWaiverId) return;

      const client = createTestClient();

      await expectToThrow(() =>
        client.mutation(api.waivers.sign, {
          tenantId: tenantId(),
          waiverId: updatedWaiverId!,
        })
      );
    });

    test("tenant isolation: cannot sign a waiver from another tenant", async () => {
      if (!updatedWaiverId) return;

      // Dave is only in cf-alpha; this waiver belongs to cf-alpha
      // but if Dave tried to sign it via cf-beta tenant context, it should fail
      const client = await clientFor("dave");

      await expectToThrow(
        () =>
          client.mutation(api.waivers.sign, {
            tenantId: betaTenantId(),
            waiverId: updatedWaiverId!,
          }),
        "not a member"
      );
    });
  });

  // ==========================================================================
  // getSignatureStatus — any tenant member
  // ==========================================================================

  describe("getSignatureStatus", () => {
    test("athlete who signed gets signed=true", async () => {
      if (!updatedWaiverId) return;

      const client = await clientFor("dave");

      const status = await client.query(api.waivers.getSignatureStatus, {
        tenantId: tenantId(),
        waiverId: updatedWaiverId,
      });

      expect(status.signed).toBe(true);
      expect(status.signedAt).toBeDefined();
      expect(typeof status.signedAt).toBe("number");
    });

    test("athlete who has not signed gets signed=false", async () => {
      if (!updatedWaiverId) return;

      const client = await clientFor("eve");

      const status = await client.query(api.waivers.getSignatureStatus, {
        tenantId: tenantId(),
        waiverId: updatedWaiverId,
      });

      expect(status.signed).toBe(false);
      expect(status.signedAt).toBeUndefined();
    });

    test("owner can check their own signature status", async () => {
      if (!updatedWaiverId) return;

      const client = await clientFor("alice");

      const status = await client.query(api.waivers.getSignatureStatus, {
        tenantId: tenantId(),
        waiverId: updatedWaiverId,
      });

      // Alice hasn't signed yet
      expect(status.signed).toBe(false);
    });

    test("unauthenticated user cannot check signature status", async () => {
      if (!updatedWaiverId) return;

      const client = createTestClient();

      await expectToThrow(() =>
        client.query(api.waivers.getSignatureStatus, {
          tenantId: tenantId(),
          waiverId: updatedWaiverId!,
        })
      );
    });

    test("tenant isolation: cannot check signature status in another tenant", async () => {
      if (!updatedWaiverId) return;

      // Dave only belongs to cf-alpha
      const client = await clientFor("dave");

      await expectToThrow(
        () =>
          client.query(api.waivers.getSignatureStatus, {
            tenantId: betaTenantId(),
            waiverId: updatedWaiverId!,
          }),
        "not a member"
      );
    });
  });

  // ==========================================================================
  // Full lifecycle
  // ==========================================================================

  describe("full lifecycle", () => {
    test("owner creates waiver -> athlete signs -> check status -> owner updates -> new signing required", async () => {
      const aliceClient = await clientFor("alice");
      const eveClient = await clientFor("eve");

      // 1. Owner creates a new waiver
      const waiverId = (await aliceClient.mutation(api.waivers.create, {
        tenantId: tenantId(),
        title: "Photo Release Waiver",
        content: "I consent to having my photo taken during classes...",
      })) as Id<"waivers">;
      expectValidId(waiverId);

      // 2. Athlete signs the waiver
      const signatureId = await eveClient.mutation(api.waivers.sign, {
        tenantId: tenantId(),
        waiverId,
      });
      expectValidId(signatureId);

      // 3. Verify signed status
      const statusAfterSign = await eveClient.query(api.waivers.getSignatureStatus, {
        tenantId: tenantId(),
        waiverId,
      });
      expect(statusAfterSign.signed).toBe(true);

      // 4. Owner updates (versions) the waiver
      const newWaiverId = (await aliceClient.mutation(api.waivers.update, {
        tenantId: tenantId(),
        waiverId,
        title: "Photo Release Waiver v2",
        content: "Updated: I consent to having my photo taken and shared on social media...",
      })) as Id<"waivers">;
      expectValidId(newWaiverId);

      // 5. Old waiver is no longer active
      const activateWaivers = await eveClient.query(api.waivers.listActive, {
        tenantId: tenantId(),
      });
      const oldWaiverInActive = activateWaivers.find((w: any) => w._id === waiverId);
      expect(oldWaiverInActive).toBeUndefined();

      // 6. Athlete has not signed the new version yet
      const statusNewVersion = await eveClient.query(api.waivers.getSignatureStatus, {
        tenantId: tenantId(),
        waiverId: newWaiverId,
      });
      expect(statusNewVersion.signed).toBe(false);

      // 7. Athlete signs the new version
      await eveClient.mutation(api.waivers.sign, {
        tenantId: tenantId(),
        waiverId: newWaiverId,
      });

      const finalStatus = await eveClient.query(api.waivers.getSignatureStatus, {
        tenantId: tenantId(),
        waiverId: newWaiverId,
      });
      expect(finalStatus.signed).toBe(true);
    });
  });
});
