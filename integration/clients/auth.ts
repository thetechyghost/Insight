import * as crypto from "node:crypto";
import { getTestConfig } from "../config/env";

/**
 * Generate a test auth token (JWT) for the given email.
 *
 * For dev deployments: creates a self-signed JWT that Convex dev auth accepts.
 * For pre-prod: should be replaced with real auth provider tokens.
 *
 * The JWT contains the standard claims that Convex auth expects:
 * - sub: subject identifier
 * - email: user's email
 * - iss: issuer (matches Convex auth config)
 * - aud: audience (matches Convex auth config)
 * - iat: issued at
 * - exp: expiration
 */
export async function getAuthToken(email: string): Promise<string> {
  const config = getTestConfig();

  if (config.target === "preprod") {
    return getPreProdAuthToken(email);
  }

  return getDevAuthToken(email);
}

/**
 * Generate a dev auth token.
 *
 * For Convex dev deployments, you need to configure the auth provider
 * in convex/auth.config.ts to accept tokens from your test issuer.
 *
 * This generates a simple JWT signed with HMAC-SHA256.
 * Configure your Convex dev deployment to accept this issuer.
 */
function getDevAuthToken(email: string): string {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: `test|${email}`,
    email,
    iss: "https://insight-test.example.com",
    aud: "convex",
    iat: now,
    exp: now + 3600, // 1 hour
  };

  const secret = process.env.TEST_JWT_SECRET ?? "test-secret-for-dev-only";

  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");

  return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Get auth token for pre-prod environment.
 * Override this with your actual auth provider (Clerk, Auth0, etc.)
 */
function getPreProdAuthToken(email: string): string {
  // TODO: Replace with real auth provider token generation
  // Example for Clerk: use Clerk Backend API to create a session token
  // Example for Auth0: use client credentials to get a test token
  throw new Error(
    `Pre-prod auth not configured. Set up your auth provider to generate tokens for test user: ${email}`
  );
}

/**
 * Pre-built auth tokens for standard test personas.
 * These are the emails used in the foundation seed scenario.
 */
export const TEST_USERS = {
  alice: { email: "alice@test.insight.app", name: "Alice Owner", role: "owner" as const },
  bob: { email: "bob@test.insight.app", name: "Bob Coach", role: "coach" as const },
  carol: { email: "carol@test.insight.app", name: "Carol Admin", role: "admin" as const },
  dave: { email: "dave@test.insight.app", name: "Dave Athlete", role: "athlete" as const },
  eve: { email: "eve@test.insight.app", name: "Eve Athlete", role: "athlete" as const },
  frank: { email: "frank@test.insight.app", name: "Frank Multi", role: "athlete" as const },
  grace: { email: "grace@test.insight.app", name: "Grace Isolated", role: "owner" as const },
} as const;
