import { ConvexHttpClient } from "convex/browser";
import { FunctionReference, FunctionReturnType, OptionalRestArgs } from "convex/server";
import { getTestConfig, type TestConfig } from "../config/env";

export type TestConvexClient = ReturnType<typeof createTestClient>;

let _config: TestConfig | null = null;

function config(): TestConfig {
  if (!_config) {
    _config = getTestConfig();
  }
  return _config;
}

/**
 * Create a ConvexHttpClient pointed at the configured test deployment.
 */
export function createTestClient(): ConvexHttpClient {
  return new ConvexHttpClient(config().convexUrl);
}

/**
 * Create an authenticated client for a specific test user.
 * Sets the auth token so Convex resolves the user's identity.
 *
 * For dev deployments: uses a self-signed JWT matching the dev auth config.
 * For pre-prod: uses designated test account tokens.
 */
export function createAuthenticatedClient(authToken: string): ConvexHttpClient {
  const client = createTestClient();
  client.setAuth(authToken);
  return client;
}

/**
 * Call an HTTP action endpoint on the Convex deployment (for seed/cleanup).
 * Authenticates with the test API key.
 */
export async function callTestEndpoint(
  path: string,
  body: Record<string, unknown>
): Promise<unknown> {
  const { convexSiteUrl, testApiKey } = config();

  const response = await fetch(`${convexSiteUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(testApiKey ? { "X-Test-Api-Key": testApiKey } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Test endpoint ${path} failed (${response.status}): ${text}`);
  }

  return response.json();
}

/**
 * Retry wrapper for transient failures (network, rate limits).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 500
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastError;
}
