/**
 * Playwright global setup: seed the Convex backend with a platform admin user
 * so authenticated E2E tests can run.
 *
 * Requires the self-hosted Convex backend running (docker-compose.test.yml)
 * with ENABLE_TEST_ENDPOINTS set.
 */

const CONVEX_SITE_URL = "http://localhost:3211";
const TEST_API_KEY = "test-local-key";
const ADMIN_EMAIL = process.env.VITE_TEST_ADMIN_EMAIL
  ?? "alice+t-mmuw85g6-4t79@test.insight.app";

async function globalSetup() {
  // Step 1: Seed user
  const seedUserRes = await fetch(`${CONVEX_SITE_URL}/test/seed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Test-Api-Key": TEST_API_KEY,
    },
    body: JSON.stringify({
      users: [{ name: "E2E Admin", email: ADMIN_EMAIL }],
    }),
  });

  if (!seedUserRes.ok) {
    const text = await seedUserRes.text();
    throw new Error(`Failed to seed user: ${seedUserRes.status} ${text}`);
  }

  const seedResult = await seedUserRes.json();
  const userId = (seedResult.users as Record<string, string>)[ADMIN_EMAIL];

  // Step 2: Seed platform admin
  const seedAdminRes = await fetch(`${CONVEX_SITE_URL}/test/seed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Test-Api-Key": TEST_API_KEY,
    },
    body: JSON.stringify({
      platformAdmins: [{ userId, platformRole: "super_admin" }],
    }),
  });

  if (!seedAdminRes.ok) {
    const text = await seedAdminRes.text();
    throw new Error(`Failed to seed platform admin: ${seedAdminRes.status} ${text}`);
  }

  console.log(`[global-setup] Seeded platform admin: ${ADMIN_EMAIL} (${userId})`);
}

export default globalSetup;
