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
 * [FR-MT, FR-CS] Data Requests & Consent Records
 *
 * Tests GDPR/privacy data request lifecycle and consent management:
 * - Submit, process, complete data requests
 * - Status transition enforcement (received -> processing -> completed)
 * - Consent record/withdraw lifecycle
 * - Auth enforcement
 * - Ownership enforcement (can only withdraw own consent)
 */
describe("[FR-MT, FR-CS] Data Requests & Consent Records", () => {
  let ctx: SeedContext;
  let unauthenticatedClient: ConvexHttpClient;

  let daveAccessRequestId: Id<"data_requests">;
  let daveDeletionRequestId: Id<"data_requests">;
  let daveConsentId: Id<"consent_records">;

  beforeAll(() => {
    ctx = loadSeedContext();
    unauthenticatedClient = createTestClient();
  });

  async function clientFor(userKey: string) {
    const token = await getAuthToken(ctx.users[userKey].email!);
    return createAuthenticatedClient(token);
  }

  // ==========================================================================
  // DATA REQUESTS
  // ==========================================================================

  describe("Data Requests", () => {
    // ------------------------------------------------------------------------
    // Auth enforcement
    // ------------------------------------------------------------------------

    test("unauthenticated user cannot submit a data request", async () => {
      await expectToThrow(
        () =>
          unauthenticatedClient.mutation(api.dataRequests.submit, {
            type: "access",
          }),
        "Not authenticated"
      );
    });

    test("unauthenticated user cannot list data requests", async () => {
      await expectToThrow(
        () => unauthenticatedClient.query(api.dataRequests.listAll, {}),
        "Not authenticated"
      );
    });

    // ------------------------------------------------------------------------
    // Submit happy path
    // ------------------------------------------------------------------------

    test("user can submit an access data request", async () => {
      const client = await clientFor("dave");

      daveAccessRequestId = await client.mutation(api.dataRequests.submit, {
        type: "access",
      });

      expectValidId(daveAccessRequestId);
    });

    test("user can submit a deletion data request", async () => {
      const client = await clientFor("dave");

      daveDeletionRequestId = await client.mutation(api.dataRequests.submit, {
        type: "deletion",
      });

      expectValidId(daveDeletionRequestId);
    });

    test("user can submit an export data request", async () => {
      const client = await clientFor("eve");

      const exportId = await client.mutation(api.dataRequests.submit, {
        type: "export",
      });

      expectValidId(exportId);
    });

    test("user can submit a rectification data request", async () => {
      const client = await clientFor("eve");

      const rectId = await client.mutation(api.dataRequests.submit, {
        type: "rectification",
      });

      expectValidId(rectId);
    });

    // ------------------------------------------------------------------------
    // List data requests
    // ------------------------------------------------------------------------

    test("authenticated user can list all data requests", async () => {
      const client = await clientFor("alice");

      const requests = await client.query(api.dataRequests.listAll, {});

      expect(requests.length).toBeGreaterThanOrEqual(2);
    });

    test("list data requests can be filtered by status", async () => {
      const client = await clientFor("alice");

      const received = await client.query(api.dataRequests.listAll, {
        status: "received",
      });

      for (const r of received) {
        expect(r.status).toBe("received");
      }
    });

    // ------------------------------------------------------------------------
    // Status transitions
    // ------------------------------------------------------------------------

    test("request can be moved to processing", async () => {
      const client = await clientFor("alice");

      await client.mutation(api.dataRequests.process, {
        requestId: daveAccessRequestId,
      });

      const requests = await client.query(api.dataRequests.listAll, {
        status: "processing",
      });

      const found = requests.find((r: any) => r._id === daveAccessRequestId);
      expect(found).toBeDefined();
      expect(found!.status).toBe("processing");
      expect(found!.auditTrail).toBeDefined();
      expect(found!.auditTrail!.length).toBeGreaterThan(0);
      expect(found!.auditTrail![0].action).toBe("processing_started");
    });

    test("cannot process an already-processing request", async () => {
      const client = await clientFor("alice");

      await expectToThrow(
        () =>
          client.mutation(api.dataRequests.process, {
            requestId: daveAccessRequestId,
          }),
        "Only received requests can be processed"
      );
    });

    test("processing request can be completed", async () => {
      const client = await clientFor("alice");

      await client.mutation(api.dataRequests.complete, {
        requestId: daveAccessRequestId,
      });

      const requests = await client.query(api.dataRequests.listAll, {
        status: "completed",
      });

      const found = requests.find((r: any) => r._id === daveAccessRequestId);
      expect(found).toBeDefined();
      expect(found!.status).toBe("completed");
      expect(found!.completedDate).toBeDefined();
      expect(found!.auditTrail!.length).toBeGreaterThanOrEqual(2);
    });

    test("cannot complete a received (non-processing) request", async () => {
      const client = await clientFor("alice");

      await expectToThrow(
        () =>
          client.mutation(api.dataRequests.complete, {
            requestId: daveDeletionRequestId,
          }),
        "Only processing requests can be completed"
      );
    });

    test("cannot complete an already-completed request", async () => {
      const client = await clientFor("alice");

      await expectToThrow(
        () =>
          client.mutation(api.dataRequests.complete, {
            requestId: daveAccessRequestId,
          }),
        "Only processing requests can be completed"
      );
    });

    test("full lifecycle: received -> processing -> completed", async () => {
      const client = await clientFor("alice");

      // Process the deletion request
      await client.mutation(api.dataRequests.process, {
        requestId: daveDeletionRequestId,
      });

      // Complete the deletion request
      await client.mutation(api.dataRequests.complete, {
        requestId: daveDeletionRequestId,
      });

      const requests = await client.query(api.dataRequests.listAll, {});
      const found = requests.find((r: any) => r._id === daveDeletionRequestId);
      expect(found!.status).toBe("completed");
      expect(found!.auditTrail!.length).toBe(2);
    });
  });

  // ==========================================================================
  // CONSENT RECORDS
  // ==========================================================================

  describe("Consent Records", () => {
    // ------------------------------------------------------------------------
    // Auth enforcement
    // ------------------------------------------------------------------------

    test("unauthenticated user cannot list consent records", async () => {
      await expectToThrow(
        () => unauthenticatedClient.query(api.consentRecords.listMine, {}),
        "Not authenticated"
      );
    });

    test("unauthenticated user cannot record consent", async () => {
      await expectToThrow(
        () =>
          unauthenticatedClient.mutation(api.consentRecords.record, {
            type: "terms_of_service",
            version: "1.0",
          }),
        "Not authenticated"
      );
    });

    // ------------------------------------------------------------------------
    // CRUD happy path
    // ------------------------------------------------------------------------

    test("user can record consent (terms of service)", async () => {
      const client = await clientFor("dave");

      daveConsentId = await client.mutation(api.consentRecords.record, {
        type: "terms_of_service",
        version: "2.0",
        ipAddress: "192.168.1.1",
      });

      expectValidId(daveConsentId);
    });

    test("user can record consent (privacy policy)", async () => {
      const client = await clientFor("dave");

      const privacyId = await client.mutation(api.consentRecords.record, {
        type: "privacy_policy",
        version: "1.5",
      });

      expectValidId(privacyId);
    });

    test("user can record consent (marketing)", async () => {
      const client = await clientFor("dave");

      const marketingId = await client.mutation(api.consentRecords.record, {
        type: "marketing",
        version: "1.0",
      });

      expectValidId(marketingId);
    });

    test("user can list their own consent records", async () => {
      const client = await clientFor("dave");

      const records = await client.query(api.consentRecords.listMine, {});

      expect(records.length).toBeGreaterThanOrEqual(3);

      const types = records.map((r: any) => r.type);
      expect(types).toContain("terms_of_service");
      expect(types).toContain("privacy_policy");
      expect(types).toContain("marketing");
    });

    test("consent records include timestamp and version", async () => {
      const client = await clientFor("dave");

      const records = await client.query(api.consentRecords.listMine, {});
      const tos = records.find((r: any) => r._id === daveConsentId);

      expect(tos).toBeDefined();
      expect(tos!.versionAccepted).toBe("2.0");
      expect(tos!.timestamp).toBeDefined();
      expect(tos!.ipAddress).toBe("192.168.1.1");
    });

    // ------------------------------------------------------------------------
    // Ownership enforcement
    // ------------------------------------------------------------------------

    test("user cannot withdraw another user's consent", async () => {
      const client = await clientFor("eve");

      await expectToThrow(
        () =>
          client.mutation(api.consentRecords.withdraw, {
            consentId: daveConsentId,
          }),
        "only withdraw your own consent"
      );
    });

    test("eve sees only her own consent records (empty initially)", async () => {
      const client = await clientFor("eve");

      const records = await client.query(api.consentRecords.listMine, {});

      const daveRecords = records.filter((r: any) => r._id === daveConsentId);
      expect(daveRecords.length).toBe(0);
    });

    // ------------------------------------------------------------------------
    // Withdraw consent
    // ------------------------------------------------------------------------

    test("user can withdraw their own consent", async () => {
      const client = await clientFor("dave");

      await client.mutation(api.consentRecords.withdraw, {
        consentId: daveConsentId,
      });

      const records = await client.query(api.consentRecords.listMine, {});
      const found = records.find((r: any) => r._id === daveConsentId);
      expect(found).toBeUndefined();
    });

    test("withdrawing a non-existent consent throws", async () => {
      const client = await clientFor("dave");

      await expectToThrow(
        () =>
          client.mutation(api.consentRecords.withdraw, {
            consentId: daveConsentId,
          }),
        "not found"
      );
    });

    // ------------------------------------------------------------------------
    // Cleanup — remove remaining consent records
    // ------------------------------------------------------------------------

    test("cleanup: remove remaining consent records", async () => {
      const client = await clientFor("dave");

      const records = await client.query(api.consentRecords.listMine, {});
      for (const record of records) {
        await client.mutation(api.consentRecords.withdraw, {
          consentId: record._id,
        });
      }

      const remaining = await client.query(api.consentRecords.listMine, {});
      // Filter to only records created in this test run (there may be seed data)
      expect(remaining.length).toBe(0);
    });
  });
});
