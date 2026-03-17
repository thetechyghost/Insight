import { test, expect } from "../fixtures/base";

test.describe("Feature Flags Page", () => {
  test.beforeEach(async ({ featureFlagsPage }) => {
    await featureFlagsPage.goto();
  });

  test("page renders with heading and new flag button", async ({ featureFlagsPage }) => {
    await expect(featureFlagsPage.page.getByRole("heading", { name: "Feature Flags" })).toBeVisible();
    await expect(featureFlagsPage.newFlagButton).toBeVisible();
  });

  test("table renders with headers", async ({ featureFlagsPage }) => {
    const headers = featureFlagsPage.getTableHeaders();
    await expect(headers.filter({ hasText: "Name" })).toBeVisible();
    await expect(headers.filter({ hasText: "Status" })).toBeVisible();
    await expect(headers.filter({ hasText: "Targets" })).toBeVisible();
    await expect(headers.filter({ hasText: "Rollout %" })).toBeVisible();
  });

  test("create new flag via form", async ({ featureFlagsPage }) => {
    const uniqueName = `e2e-flag-${Date.now()}`;

    await featureFlagsPage.clickNewFlag();
    await featureFlagsPage.fillFlagName(uniqueName);
    await featureFlagsPage.selectStatus("Enabled");
    await featureFlagsPage.getCreateButton().click();

    // Wait for dialog to close and data to refresh
    await featureFlagsPage.page.waitForTimeout(1000);
    await expect(featureFlagsPage.page.getByText(uniqueName)).toBeVisible({ timeout: 10_000 });
  });

  test("edit flag status", async ({ featureFlagsPage }) => {
    // Create a flag first
    const uniqueName = `e2e-edit-${Date.now()}`;
    await featureFlagsPage.clickNewFlag();
    await featureFlagsPage.fillFlagName(uniqueName);
    await featureFlagsPage.selectStatus("Disabled");
    await featureFlagsPage.getCreateButton().click();
    await featureFlagsPage.page.waitForTimeout(1000);

    // Find the row and click edit
    const row = featureFlagsPage.page.locator("tbody tr", { hasText: uniqueName });
    await row.getByText("Edit").click();

    await featureFlagsPage.selectStatus("Enabled");
    await featureFlagsPage.getSaveButton().click();

    // Verify status changed
    await featureFlagsPage.page.waitForTimeout(1000);
    await expect(row.getByText("enabled")).toBeVisible({ timeout: 10_000 });
  });

  test("delete flag with confirmation", async ({ featureFlagsPage }) => {
    // Create a flag first
    const uniqueName = `e2e-del-${Date.now()}`;
    await featureFlagsPage.clickNewFlag();
    await featureFlagsPage.fillFlagName(uniqueName);
    await featureFlagsPage.selectStatus("Disabled");
    await featureFlagsPage.getCreateButton().click();
    await featureFlagsPage.page.waitForTimeout(1000);

    // Find the row and click delete
    const row = featureFlagsPage.page.locator("tbody tr", { hasText: uniqueName });
    await row.getByText("Delete").click();

    // Confirm deletion
    await featureFlagsPage.getDeleteButton().click();

    // Wait for removal
    await featureFlagsPage.page.waitForTimeout(1000);
    await expect(featureFlagsPage.page.getByText(uniqueName)).not.toBeVisible({ timeout: 10_000 });
  });
});
