import * as crypto from "node:crypto";
import { getTestConfig } from "../config/env";

/**
 * Test-only RSA private key (PKCS#8 PEM).
 * This key is committed to the repo — it is only used in local integration tests
 * and carries no security value. The matching public key is served from
 * convex/http.ts at /.well-known/jwks.json.
 */
const TEST_PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCq2dbKpbFnScv9
xG9OkarU1bfbVSpqPEOrZPhMWZHjDreuqzpG+vOqaV3oC4olW9CCSs6JPUck+9cx
DSidpUdO3KUHf3WdLjkAze7qMmy64rgzBff71vDyqyrFcBUSvqlKmui5RyLI9sfK
m9FdzWduy03Hd9ZguiNGxbcvZCPKo8+QEE2raynH2Qsf+dIpjOC733Bj70ExMUDv
S+L/iKVCBxXuZQK912s8EvDwa1lGC4H8QvuJmLQIOqwyE9FOqQoxY/0wOOWaZA46
hrO2yM7u8kyeeGKSsewTQyf0AmOPZ+71RhycudB2XptnGyL0RUf1HHrD5wScDLOo
n8En6zeZAgMBAAECggEAJ3xqLnKl8hu1qCQ+n1d+NmtgbzIbN+tOrm2LD0ZCN8pe
fGF5eg8kwpVQjUEhf+nc4kf8vO4rI6qKvPzwDqM0vE61W2rDWXzl0sBFf94AkB62
+J/gBNXT4RnbLD9vt2HWSXZM5AlDSlPyr+pcNIQ06//TrY6OPtO2NHScljjcJshc
9Wr5DneTXimhWFwnS7DDcfLv8gK6F1W9Fep6pMC3746tVfRw7vVc9wUeltW9pK0b
gQujvpTI0UUyLQXhqZ19+OHYm0F5Nk+0EXEZsCTiDHh5NQ//Xl2QCfqt+zrSUqZj
NGKWDB7So8yyGJAkJu0xNtHi9sMq6yZjJVb+MYq3iQKBgQDqN2ED8RJjOm6SMi2F
R8DXNvVFL/rO3dXk4oY3UEmn5dbbf13ASPuAx4Zp79Qjd2LXaFf/Qa3562d1bndC
tUPOyKnFV/1fDrOy1aFwaQBklp+9vkXg2eYY1F1aKGCClakzXJm5A3aZi773rYZo
OiDkRD1fAog17v8No84D7XDuHQKBgQC6vb+70rmf4KXY+O2CYvu9WTwKuA4IrDYg
b3N11QgqirdxXJWDhVdvGdhYl19mx/HWtrdC/lOt3dDQlxvSqXdbiF7KBlsKBLKB
a5XzMdFnX3AMYutRgQFUK5v4TfJsJvhcemF9o/r5Ayi2l1fA1f16xRNfLobtvFo/
/zj3EKomrQKBgQCKL0Yz1yVsGetmoegtfFoQH8KxoU8ugb9SnTtmox3xyy7qrciY
S/bm0dFB61eT3ToZsNxKI2wLyZFuvU/rsZpiBA31+qXoUXpABr6K3ch3kE6K2hnM
QYL6H0E8khnusXH0davUdnCgwsxWwLBOCg2h34j95zaJ64nbeEtyEcLRGQKBgDh/
eCbnVmncmdDPX2x3bhqXiOblULmnAKlHjvMzhMj6Nw4BKOslyJJAi4giJCcAj1aa
6U9HiyGrXqX9UdmmlAoJdERDMAAT873cQv3VMLnJ0iitNOzvzuscVpAFZTb7g2DX
Ve+hUSlNn1++4jnhhFNElNvTQ9dhiRybpyx4ykHxAoGBAKIBRy5yHjg6mlTa4YbL
Iap7GRVLL/ORtZuYpSAt3hSFCsTAdPorlTqXQeHzMeOJxKKVo9UZj0REjwvnI/cr
EjLuekI7RQcVtD7xIvQ633TUWm/upAqyxruG85ZWsg8OcI36jp7mY9lRkW3KtnWa
/BtG4qcoTEQjc8upmQiYbN28
-----END PRIVATE KEY-----`;

/**
 * Generate a test auth token (JWT) for the given email.
 *
 * For dev/local deployments: creates an RS256-signed JWT verified via the
 * JWKS endpoint at /.well-known/jwks.json on the Convex site URL.
 * For pre-prod: should be replaced with real auth provider tokens.
 */
export async function getAuthToken(email: string): Promise<string> {
  const config = getTestConfig();

  if (config.target === "preprod") {
    return getPreProdAuthToken(email);
  }

  return getDevAuthToken(email, config.convexSiteUrl);
}

/**
 * Generate a dev auth token using RS256.
 * The issuer must match `domain` in convex/auth.config.ts.
 */
function getDevAuthToken(email: string, issuer: string): string {
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: "insight-test-key-1",
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: `test|${email}`,
    email,
    iss: issuer,
    aud: "convex",
    iat: now,
    exp: now + 3600, // 1 hour
  };

  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  const privateKey = crypto.createPrivateKey(TEST_PRIVATE_KEY_PEM);
  const signature = crypto
    .sign("sha256", Buffer.from(signingInput), {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    })
    .toString("base64url");

  return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Get auth token for pre-prod environment.
 * Override this with your actual auth provider (Clerk, Auth0, etc.)
 */
function getPreProdAuthToken(email: string): string {
  // TODO: Replace with real auth provider token generation
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
