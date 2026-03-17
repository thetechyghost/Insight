/**
 * Browser-compatible JWT auth for local dev/test against self-hosted Convex.
 *
 * Signs RS256 JWTs using the Web Crypto API with the same test private key
 * used by `integration/clients/auth.ts`. The key is committed and has no
 * security value — it is only used in local development.
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

const AUTH_STORAGE_KEY = "insight_dev_auth";

interface StoredAuth {
  email: string;
  token: string;
  expiresAt: number; // unix seconds
}

// ---------------------------------------------------------------------------
// Key import
// ---------------------------------------------------------------------------

let cachedKey: CryptoKey | null = null;

async function importPrivateKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const pemBody = TEST_PRIVATE_KEY_PEM.replace(/-----[^-]+-----/g, "")
    .replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  cachedKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return cachedKey;
}

// ---------------------------------------------------------------------------
// JWT generation
// ---------------------------------------------------------------------------

function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const b of arr) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function encodeJson(obj: unknown): string {
  return base64url(new TextEncoder().encode(JSON.stringify(obj)));
}

export async function generateTestToken(email: string): Promise<string> {
  const key = await importPrivateKey();

  const header = { alg: "RS256", typ: "JWT", kid: "insight-test-key-1" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: `test|${email}`,
    email,
    iss: "http://localhost:3211",
    aud: "convex",
    iat: now,
    exp: now + 3600,
  };

  const headerB64 = encodeJson(header);
  const payloadB64 = encodeJson(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );

  return `${headerB64}.${payloadB64}.${base64url(sig)}`;
}

// ---------------------------------------------------------------------------
// Auth state (localStorage)
// ---------------------------------------------------------------------------

export function storeAuth(email: string, token: string): void {
  // Decode payload to get exp
  const payloadB64 = token.split(".")[1];
  const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
  const stored: StoredAuth = { email, token, expiresAt: payload.exp };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(stored));
}

export function getStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

// ---------------------------------------------------------------------------
// Token provider for convex.setAuth()
// ---------------------------------------------------------------------------

export async function fetchToken(): Promise<string | null> {
  const stored = getStoredAuth();
  if (!stored) return null;

  const now = Math.floor(Date.now() / 1000);
  // Regenerate if less than 60s to expiry
  if (stored.expiresAt - now < 60) {
    const token = await generateTestToken(stored.email);
    storeAuth(stored.email, token);
    return token;
  }

  return stored.token;
}
