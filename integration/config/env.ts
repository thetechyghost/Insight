import "dotenv/config";

export type TestTarget = "dev" | "preprod";

export interface TestConfig {
  target: TestTarget;
  convexUrl: string;
  convexSiteUrl: string;
  testApiKey: string;
}

/**
 * Load integration test configuration from environment variables.
 * Throws if required variables are missing.
 */
export function getTestConfig(): TestConfig {
  const target = (process.env.TEST_TARGET ?? "dev") as TestTarget;
  if (target !== "dev" && target !== "preprod") {
    throw new Error(`Invalid TEST_TARGET: ${target}. Must be "dev" or "preprod".`);
  }

  const convexUrl =
    target === "preprod"
      ? process.env.CONVEX_PREPROD_URL
      : process.env.CONVEX_URL;

  if (!convexUrl) {
    const envVar = target === "preprod" ? "CONVEX_PREPROD_URL" : "CONVEX_URL";
    throw new Error(
      `Missing ${envVar} environment variable. Copy .env.test.example to .env.test and configure it.`
    );
  }

  const convexSiteUrl =
    process.env.CONVEX_SITE_URL ??
    convexUrl.replace(".convex.cloud", ".convex.site");

  const testApiKey = process.env.TEST_API_KEY ?? "";

  return { target, convexUrl, convexSiteUrl, testApiKey };
}
