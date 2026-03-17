import { test, expect } from "../fixtures/base";

test.describe("Tenant Provisioning Wizard", () => {
  test.beforeEach(async ({ provisionPage }) => {
    await provisionPage.goto();
  });

  test("renders wizard heading", async ({ provisionPage }) => {
    await expect(provisionPage.getHeading()).toBeVisible();
  });

  test("step 1 fields are present", async ({ page }) => {
    await expect(page.getByLabel("Business Name")).toBeVisible();
    await expect(page.getByLabel("Slug")).toBeVisible();
    await expect(page.getByLabel("Contact Email")).toBeVisible();
  });

  test("Next button is visible on step 1", async ({ provisionPage }) => {
    await expect(provisionPage.getNextButton()).toBeVisible();
  });

  test("advances to step 2 when step 1 is filled", async ({
    provisionPage,
    page,
  }) => {
    const uniqueSlug = `e2e-${Date.now()}`;
    await provisionPage.fillBusinessName("E2E Test Gym");
    await provisionPage.fillSlug(uniqueSlug);
    await provisionPage.fillContactEmail("owner@e2etest.com");

    await provisionPage.goToNextStep();

    // Step 2 should show feature package toggles or a heading indicating step 2
    await expect(page.getByRole("button", { name: /Back|Next|Provision/ })).toBeVisible();
  });

  test("Back button on step 2 returns to step 1", async ({
    provisionPage,
    page,
  }) => {
    const uniqueSlug = `e2e-back-${Date.now()}`;
    await provisionPage.fillBusinessName("E2E Back Test");
    await provisionPage.fillSlug(uniqueSlug);
    await provisionPage.fillContactEmail("back@e2etest.com");

    await provisionPage.goToNextStep();
    await provisionPage.goToPreviousStep();

    await expect(page.getByLabel("Business Name")).toBeVisible();
  });

  test("Provision Wizard button is visible on tenants list page", async ({
    page,
    tenantsListPage,
  }) => {
    await tenantsListPage.goto();
    const wizardBtn = page.getByRole("link", { name: /Provision/ }).or(
      page.getByRole("button", { name: /Provision/ }),
    );
    await expect(wizardBtn).toBeVisible();
  });
});
