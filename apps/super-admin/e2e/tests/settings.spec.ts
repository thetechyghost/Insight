import { test, expect } from "../fixtures/base";
import { SettingsPage } from "../page-objects/settings.page";

test.describe("Settings Page", () => {
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    settingsPage = new SettingsPage(page);
    await settingsPage.goto();
  });

  test("page renders with heading and alert threshold form", async () => {
    await expect(settingsPage.page.getByRole("heading", { name: "Platform Settings" })).toBeVisible();
    await expect(settingsPage.getLowActivityInput()).toBeVisible();
    await expect(settingsPage.getMaxErrorRateInput()).toBeVisible();
    await expect(settingsPage.getMinMemberCountInput()).toBeVisible();
    await expect(settingsPage.getSaveButton()).toBeVisible();
  });

  test("can update alert thresholds", async () => {
    await settingsPage.getLowActivityInput().fill("30");
    await settingsPage.getMaxErrorRateInput().fill("10");
    await settingsPage.getMinMemberCountInput().fill("25");

    await settingsPage.getSaveButton().click();

    // Verify "Saved!" message appears
    await expect(settingsPage.page.getByText("Saved!")).toBeVisible({ timeout: 5_000 });
  });
});
