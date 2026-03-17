import { test as setup, expect } from "@playwright/test";

const AUTH_FILE = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#email").fill("admin@insight.com");
  await page.locator("#password").fill("password123");
  await page.getByRole("button", { name: "Sign In" }).click();

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  // Save signed-in state (localStorage + cookies)
  await page.context().storageState({ path: AUTH_FILE });
});
