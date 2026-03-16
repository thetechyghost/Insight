import { describe, test, expect, beforeAll } from "vitest";
import { ConvexHttpClient } from "convex/browser";
import { createTestClient, createAuthenticatedClient } from "../../clients/convex-client";
import { getAuthToken } from "../../clients/auth";
import { loadSeedContext } from "../../helpers/load-context";
import { expectToThrow } from "../../helpers/assertions";
import { api } from "../../../convex/_generated/api";
import type { SeedContext } from "../../seed/types";

/**
 * [FR-PA, FR-MT, FR-CS] Authentication & Authorization
 *
 * Tests that the auth layer correctly:
 * - Rejects unauthenticated requests
 * - Resolves authenticated users to their profiles
 * - Distinguishes between different authenticated users
 */
describe("[FR-PA, FR-MT, FR-CS] Authentication & Authorization", () => {
  let ctx: SeedContext;
  let unauthenticatedClient: ConvexHttpClient;

  beforeAll(async () => {
    ctx = loadSeedContext();
    unauthenticatedClient = createTestClient();
  });

  test("getMe rejects unauthenticated requests", async () => {
    await expectToThrow(
      () => unauthenticatedClient.query(api.users.getMe, {}),
      "Not authenticated"
    );
  });

  test("authenticated user can retrieve own profile", async () => {
    const token = await getAuthToken(ctx.users.alice.email!);
    const client = createAuthenticatedClient(token);

    const profile = await client.query(api.users.getMe, {});
    expect(profile).not.toBeNull();
    expect(profile!.name).toBe("Alice Owner");
    expect(profile!.email).toBe(ctx.users.alice.email);
  });

  test("different authenticated users get different profiles", async () => {
    const aliceToken = await getAuthToken(ctx.users.alice.email!);
    const daveToken = await getAuthToken(ctx.users.dave.email!);

    const aliceClient = createAuthenticatedClient(aliceToken);
    const daveClient = createAuthenticatedClient(daveToken);

    const aliceProfile = await aliceClient.query(api.users.getMe, {});
    const daveProfile = await daveClient.query(api.users.getMe, {});

    expect(aliceProfile!.email).toBe(ctx.users.alice.email);
    expect(daveProfile!.email).toBe(ctx.users.dave.email);
    expect(aliceProfile!._id).not.toBe(daveProfile!._id);
  });

  test("updateProfile rejects unauthenticated requests", async () => {
    await expectToThrow(
      () => unauthenticatedClient.mutation(api.users.updateProfile, { name: "Hacker" }),
      "Not authenticated"
    );
  });

  test("authenticated user can update own profile", async () => {
    const token = await getAuthToken(ctx.users.dave.email!);
    const client = createAuthenticatedClient(token);

    await client.mutation(api.users.updateProfile, { bio: "Integration test bio" });

    const profile = await client.query(api.users.getMe, {});
    expect(profile!.bio).toBe("Integration test bio");
  });

  test("getMyTenants returns all tenant memberships for authenticated user", async () => {
    // Frank is in both cf-alpha and cf-beta
    const token = await getAuthToken(ctx.users.frank.email!);
    const client = createAuthenticatedClient(token);

    const tenants = await client.query(api.tenants.getMyTenants, {});
    expect(tenants.length).toBeGreaterThanOrEqual(2);

    const slugs = tenants.map((t: any) => t.tenant.slug);
    expect(slugs).toContain(ctx.tenants.cfAlpha.slug);
    expect(slugs).toContain(ctx.tenants.cfBeta.slug);
  });
});
