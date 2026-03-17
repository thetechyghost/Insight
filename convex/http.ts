import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

// ============================================================================
// JWKS endpoint for test JWT authentication
// Used by auth.config.ts (domain: http://localhost:3211) to verify RS256 tokens
// in local integration tests. The key pair is committed — it is a test-only key.
// ============================================================================

const TEST_JWKS = {
  keys: [
    {
      kty: "RSA",
      use: "sig",
      alg: "RS256",
      kid: "insight-test-key-1",
      n: "qtnWyqWxZ0nL_cRvTpGq1NW321UqajxDq2T4TFmR4w63rqs6Rvrzqmld6AuKJVvQgkrOiT1HJPvXMQ0onaVHTtylB391nS45AM3u6jJsuuK4MwX3-9bw8qsqxXAVEr6pSprouUciyPbHypvRXc1nbstNx3fWYLojRsW3L2QjyqPPkBBNq2spx9kLH_nSKYzgu99wY-9BMTFA70vi_4ilQgcV7mUCvddrPBLw8GtZRguB_EL7iZi0CDqsMhPRTqkKMWP9MDjlmmQOOoaztsjO7vJMnnhikrHsE0Mn9AJjj2fu9UYcnLnQdl6bZxsi9EVH9Rx6w-cEnAyzqJ_BJ-s3mQ",
      e: "AQAB",
    },
  ],
};

http.route({
  path: "/.well-known/jwks.json",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(JSON.stringify(TEST_JWKS), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/.well-known/openid-configuration",
  method: "GET",
  handler: httpAction(async () => {
    // The issuer must match `domain` in auth.config.ts and the `iss` JWT claim.
    // Hardcoded to localhost:3211 for the local Docker test environment.
    const config = {
      issuer: "http://localhost:3211",
      jwks_uri: "http://localhost:3211/.well-known/jwks.json",
    };
    return new Response(JSON.stringify(config), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ============================================================================
// Test helpers
// ============================================================================

/**
 * Guard: verify the request carries a valid test API key.
 * Returns null if valid, or an error Response if not.
 */
function verifyTestApiKey(request: Request): Response | null {
  const testApiKey = process.env.ENABLE_TEST_ENDPOINTS;
  if (!testApiKey) {
    return new Response("Test endpoints are disabled", { status: 403 });
  }

  const providedKey = request.headers.get("X-Test-Api-Key");
  if (providedKey !== testApiKey) {
    return new Response("Invalid test API key", { status: 401 });
  }

  return null;
}

const jsonHeaders = { "Content-Type": "application/json" };

// Auth provider webhook — called when a new user signs up
http.route({
  path: "/auth/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();

    // Extract user info from webhook payload
    // Adapt this to your auth provider's webhook format
    const { name, email } = body;

    if (!email) {
      return new Response("Missing email in webhook payload", { status: 400 });
    }

    // Create or get user (idempotent)
    const userId = await ctx.runMutation(api.users.createOrGet, {
      name: name ?? "Unknown",
      email,
    });

    return new Response(JSON.stringify({ userId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Stripe webhook — handles payment events
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // In production, verify Stripe webhook signature here
    const body = await request.json();
    const { type } = body;

    // Route to appropriate handler based on event type
    // These handlers will be implemented in the billing functions
    switch (type) {
      case "invoice.paid":
      case "invoice.payment_failed":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        // TODO: Route to appropriate internal functions
        break;
      default:
        // Unhandled event type
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ============================================================================
// Integration Test Endpoints
// Gated by ENABLE_TEST_ENDPOINTS environment variable on the Convex deployment.
// ============================================================================

// POST /test/seed — Seed foundation data (users, tenants, memberships, roles)
http.route({
  path: "/test/seed",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authError = verifyTestApiKey(request);
    if (authError) return authError;

    const body = await request.json();
    const { users, tenants, memberships } = body;

    const result: Record<string, unknown> = {};

    // Seed tenants
    if (Array.isArray(tenants)) {
      result.tenants = {};
      for (const tenant of tenants) {
        const tenantId = await ctx.runMutation(internal.testing.seedTenant, {
          name: tenant.name,
          slug: tenant.slug,
        });
        (result.tenants as Record<string, string>)[tenant.slug] = tenantId;
      }
    }

    // Seed users
    if (Array.isArray(users)) {
      result.users = {};
      for (const user of users) {
        const userId = await ctx.runMutation(internal.testing.seedUser, {
          name: user.name,
          email: user.email,
        });
        (result.users as Record<string, string>)[user.email] = userId;
      }
    }

    // Seed memberships (requires userId + tenantId from above)
    if (Array.isArray(memberships)) {
      result.memberships = [];
      for (const m of memberships) {
        const membershipId = await ctx.runMutation(
          internal.testing.seedMembership,
          {
            userId: m.userId,
            tenantId: m.tenantId,
            role: m.role,
            isPrimaryGym: m.isPrimaryGym ?? false,
          }
        );
        (result.memberships as string[]).push(membershipId);
      }
    }

    // Seed role permissions for each tenant
    if (result.tenants) {
      for (const tenantId of Object.values(
        result.tenants as Record<string, string>
      )) {
        await ctx.runMutation(internal.testing.seedRolesPermissions, {
          tenantId: tenantId as any,
        });
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: jsonHeaders,
    });
  }),
});

// POST /test/cleanup — Clean up test data by prefix
http.route({
  path: "/test/cleanup",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authError = verifyTestApiKey(request);
    if (authError) return authError;

    const body = await request.json();
    const { prefix } = body;

    if (!prefix || typeof prefix !== "string") {
      return new Response("Missing or invalid prefix", { status: 400 });
    }

    const result = await ctx.runMutation(internal.testing.cleanupByPrefix, {
      prefix,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: jsonHeaders,
    });
  }),
});

export default http;
