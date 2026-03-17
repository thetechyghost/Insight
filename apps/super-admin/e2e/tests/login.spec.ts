import { test, expect } from "../fixtures/base";

test.describe("Login Page", () => {
  test("renders login form with email, password, and submit button", async ({
    loginPage,
  }) => {
    await loginPage.goto();

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.page.getByText("Sign In")).toBeVisible();
  });

  test("HTML5 validation prevents empty submit", async ({ loginPage }) => {
    await loginPage.goto();

    await loginPage.submit();

    // Should still be on login page — browser validation blocks submit
    await expect(loginPage.page).toHaveURL(/\/login/);
  });

  test("submit with credentials navigates to dashboard", async ({
    loginPage,
  }) => {
    await loginPage.goto();

    await loginPage.fillEmail("admin@insight.com");
    await loginPage.fillPassword("password123");
    await loginPage.submit();

    await expect(loginPage.page).toHaveURL(/\/dashboard/);
  });
});
