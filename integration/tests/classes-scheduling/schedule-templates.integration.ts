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
 * [FR-SB] Schedule Templates
 *
 * Tests the recurring schedule template CRUD:
 * - Create, read, update, soft-delete schedule templates
 * - Auth enforcement (unauthenticated rejected)
 * - RBAC enforcement (admin+ required for mutations, any member can read)
 * - Tenant isolation
 */
describe("[FR-SB] Schedule Templates", () => {
  let ctx: SeedContext;
  let unauthenticatedClient: ConvexHttpClient;

  let testClassId: Id<"classes">;
  let testTemplateId: Id<"schedule_templates">;

  beforeAll(() => {
    ctx = loadSeedContext();
    unauthenticatedClient = createTestClient();
  });

  async function clientFor(userKey: string) {
    const token = await getAuthToken(ctx.users[userKey].email!);
    return createAuthenticatedClient(token);
  }

  const tenantId = () => ctx.tenants.cfAlpha.id as Id<"tenants">;

  // --------------------------------------------------------------------------
  // Setup
  // --------------------------------------------------------------------------

  test("setup: coach creates a class for schedule template tests", async () => {
    const client = await clientFor("bob");

    testClassId = await client.mutation(api.classes.create, {
      tenantId: tenantId(),
      name: "Template Test Class",
      capacity: 20,
    });
    expectValidId(testClassId);
  });

  // --------------------------------------------------------------------------
  // Auth enforcement
  // --------------------------------------------------------------------------

  test("unauthenticated user cannot list schedule templates", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.query(api.scheduleTemplates.list, {
          tenantId: tenantId(),
        }),
      "Not authenticated"
    );
  });

  test("unauthenticated user cannot create a schedule template", async () => {
    await expectToThrow(
      () =>
        unauthenticatedClient.mutation(api.scheduleTemplates.create, {
          tenantId: tenantId(),
          name: "Hacked Template",
          classId: testClassId,
          dayOfWeek: 1,
          startTime: "06:00",
          endTime: "07:00",
        }),
      "Not authenticated"
    );
  });

  // --------------------------------------------------------------------------
  // RBAC enforcement (admin+ for mutations)
  // --------------------------------------------------------------------------

  test("athlete cannot create a schedule template (admin+ required)", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.mutation(api.scheduleTemplates.create, {
          tenantId: tenantId(),
          name: "Athlete Template",
          classId: testClassId,
          dayOfWeek: 1,
          startTime: "06:00",
          endTime: "07:00",
        }),
      "Insufficient role"
    );
  });

  test("coach cannot create a schedule template (admin+ required)", async () => {
    const client = await clientFor("bob");

    await expectToThrow(
      () =>
        client.mutation(api.scheduleTemplates.create, {
          tenantId: tenantId(),
          name: "Coach Template",
          classId: testClassId,
          dayOfWeek: 1,
          startTime: "06:00",
          endTime: "07:00",
        }),
      "Insufficient role"
    );
  });

  // --------------------------------------------------------------------------
  // CRUD happy path (admin+)
  // --------------------------------------------------------------------------

  test("admin can create a schedule template", async () => {
    const client = await clientFor("carol");

    testTemplateId = await client.mutation(api.scheduleTemplates.create, {
      tenantId: tenantId(),
      name: "Mon 6AM WOD",
      classId: testClassId,
      dayOfWeek: 1, // Monday
      startTime: "06:00",
      endTime: "07:00",
    });

    expectValidId(testTemplateId);
  });

  test("any member can list schedule templates", async () => {
    const client = await clientFor("dave");

    const templates = await client.query(api.scheduleTemplates.list, {
      tenantId: tenantId(),
    });

    expect(templates.length).toBeGreaterThan(0);
    const names = templates.map((t: any) => t.name);
    expect(names).toContain("Mon 6AM WOD");
  });

  test("admin can retrieve a schedule template by ID", async () => {
    const client = await clientFor("carol");

    const template = await client.query(api.scheduleTemplates.getById, {
      tenantId: tenantId(),
      templateId: testTemplateId,
    });

    expect(template.name).toBe("Mon 6AM WOD");
    expect(template.dayOfWeek).toBe(1);
    expect(template.startTime).toBe("06:00");
    expect(template.endTime).toBe("07:00");
    expect(template.isActive).toBe(true);
  });

  test("admin can update a schedule template", async () => {
    const client = await clientFor("carol");

    await client.mutation(api.scheduleTemplates.update, {
      tenantId: tenantId(),
      templateId: testTemplateId,
      startTime: "06:30",
      endTime: "07:30",
    });

    const updated = await client.query(api.scheduleTemplates.getById, {
      tenantId: tenantId(),
      templateId: testTemplateId,
    });

    expect(updated.startTime).toBe("06:30");
    expect(updated.endTime).toBe("07:30");
  });

  test("athlete cannot update a schedule template (admin+ required)", async () => {
    const client = await clientFor("dave");

    await expectToThrow(
      () =>
        client.mutation(api.scheduleTemplates.update, {
          tenantId: tenantId(),
          templateId: testTemplateId,
          name: "Hacked Template",
        }),
      "Insufficient role"
    );
  });

  test("admin can soft-delete (remove) a schedule template", async () => {
    const client = await clientFor("carol");

    await client.mutation(api.scheduleTemplates.remove, {
      tenantId: tenantId(),
      templateId: testTemplateId,
    });

    const template = await client.query(api.scheduleTemplates.getById, {
      tenantId: tenantId(),
      templateId: testTemplateId,
    });

    expect(template.isActive).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Tenant isolation
  // --------------------------------------------------------------------------

  test("grace (cf-beta) cannot list cf-alpha schedule templates", async () => {
    const client = await clientFor("grace");

    await expectToThrow(
      () =>
        client.query(api.scheduleTemplates.list, { tenantId: tenantId() }),
      "not a member"
    );
  });

  test("grace (cf-beta) cannot create a template referencing cf-alpha class", async () => {
    const client = await clientFor("grace");

    await expectToThrow(
      () =>
        client.mutation(api.scheduleTemplates.create, {
          tenantId: tenantId(),
          name: "Cross-tenant Template",
          classId: testClassId,
          dayOfWeek: 1,
          startTime: "06:00",
          endTime: "07:00",
        }),
      "not a member"
    );
  });

  // --------------------------------------------------------------------------
  // Cleanup
  // --------------------------------------------------------------------------

  test("cleanup: coach removes the test class", async () => {
    const client = await clientFor("bob");

    await client.mutation(api.classes.remove, {
      tenantId: tenantId(),
      classId: testClassId,
    });
  });
});
