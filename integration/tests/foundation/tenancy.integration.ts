import { describe, test, expect, beforeAll } from "vitest";
import { ConvexHttpClient } from "convex/browser";
import { createAuthenticatedClient } from "../../clients/convex-client";
import { getAuthToken } from "../../clients/auth";
import { loadSeedContext } from "../../helpers/load-context";
import { expectToThrow } from "../../helpers/assertions";
import { api } from "../../../convex/_generated/api";
import type { SeedContext } from "../../seed/types";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * [FR-MT] Multi-Tenancy Isolation
 *
 * Tests that the tenant isolation layer correctly:
 * - Prevents cross-tenant data access
 * - Allows multi-gym users to access their own tenants
 * - Scopes all queries by tenantId
 */
describe("[FR-MT] Multi-Tenancy Isolation", () => {
  let ctx: SeedContext;

  beforeAll(() => {
    ctx = loadSeedContext();
  });

  test("user can access their own tenant data", async () => {
    const token = await getAuthToken(ctx.users.alice.email!);
    const client = createAuthenticatedClient(token);

    const tenant = await client.query(api.tenants.getById, {
      tenantId: ctx.tenants.cfAlpha.id as Id<"tenants">,
    });

    expect(tenant.name).toBe("CrossFit Alpha");
    expect(tenant.slug).toBe(ctx.tenants.cfAlpha.slug);
  });

  test("user cannot access a tenant they don't belong to", async () => {
    // Dave is only in cf-alpha, trying to access cf-beta
    const token = await getAuthToken(ctx.users.dave.email!);
    const client = createAuthenticatedClient(token);

    await expectToThrow(
      () =>
        client.query(api.tenants.getById, {
          tenantId: ctx.tenants.cfBeta.id as Id<"tenants">,
        }),
      "not a member"
    );
  });

  test("multi-gym user can access both tenants", async () => {
    // Frank is in both cf-alpha and cf-beta
    const token = await getAuthToken(ctx.users.frank.email!);
    const client = createAuthenticatedClient(token);

    const alpha = await client.query(api.tenants.getById, {
      tenantId: ctx.tenants.cfAlpha.id as Id<"tenants">,
    });
    expect(alpha.name).toBe("CrossFit Alpha");

    const beta = await client.query(api.tenants.getById, {
      tenantId: ctx.tenants.cfBeta.id as Id<"tenants">,
    });
    expect(beta.name).toBe("CrossFit Beta");
  });

  test("tenant-scoped query returns only data for that tenant", async () => {
    // Alice (owner of cf-alpha) lists memberships — should only see cf-alpha members
    const token = await getAuthToken(ctx.users.alice.email!);
    const client = createAuthenticatedClient(token);

    const members = await client.query(api.memberships.listByTenant, {
      tenantId: ctx.tenants.cfAlpha.id as Id<"tenants">,
    });

    // All returned memberships should be for cf-alpha
    for (const m of members) {
      expect(m.tenantId).toBe(ctx.tenants.cfAlpha.id);
    }

    // Grace (cf-beta only) should NOT appear
    const emails = members.map((m: any) => m.user.email);
    expect(emails).not.toContain(ctx.users.grace.email);
  });

  test("owner of tenant A cannot list members of tenant B", async () => {
    // Alice is owner of cf-alpha, not a member of cf-beta
    const token = await getAuthToken(ctx.users.alice.email!);
    const client = createAuthenticatedClient(token);

    await expectToThrow(
      () =>
        client.query(api.memberships.listByTenant, {
          tenantId: ctx.tenants.cfBeta.id as Id<"tenants">,
        }),
      "not a member"
    );
  });

  test("getBySlug works without authentication (public query)", async () => {
    const { createTestClient } = await import("../../clients/convex-client");
    const client = createTestClient();

    const tenant = await client.query(api.tenants.getBySlug, {
      slug: ctx.tenants.cfAlpha.slug!,
    });

    expect(tenant).not.toBeNull();
    expect(tenant!.name).toBe("CrossFit Alpha");
  });

  test("getBySlug returns null for non-existent slug", async () => {
    const { createTestClient } = await import("../../clients/convex-client");
    const client = createTestClient();

    const tenant = await client.query(api.tenants.getBySlug, {
      slug: "non-existent-slug-12345",
    });

    expect(tenant).toBeNull();
  });
});
