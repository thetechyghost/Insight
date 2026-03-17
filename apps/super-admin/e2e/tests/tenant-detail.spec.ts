import { test, expect } from "../fixtures/base";
import { waitForConvex } from "../fixtures/base";

// These tests navigate to a tenant detail page. We first go to the tenants list
// and click "View" on the first row to get a valid tenant ID.

async function navigateToFirstTenant(page: import("@playwright/test").Page) {
  await page.goto("/tenants");
  await waitForConvex(page);
  await page.locator("tbody tr").first().getByText("View").click();
  await waitForConvex(page);
}

test.describe("Tenant Detail Page", () => {
  test("header shows tenant name and status badge", async ({ page }) => {
    await navigateToFirstTenant(page);

    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
    const name = await heading.textContent();
    expect(name?.length).toBeGreaterThan(0);

    // Status badge should be visible near the heading
    const badge = page.locator("h1").locator("..").locator("[class*='badge']");
    await expect(badge).toBeVisible();
  });

  test("all 5 tabs are present and switchable", async ({ page }) => {
    await navigateToFirstTenant(page);

    for (const tab of [
      "Overview",
      "Configuration",
      "Members",
      "Usage",
      "Notes",
    ]) {
      const tabTrigger = page.getByRole("tab", { name: tab });
      await expect(tabTrigger).toBeVisible();
      await tabTrigger.click();
    }
  });

  test("overview tab shows member count, owner, timezone", async ({
    page,
  }) => {
    await navigateToFirstTenant(page);

    await page.getByRole("tab", { name: "Overview" }).click();

    const panel = page.locator("[role='tabpanel']");
    await expect(panel.getByText("Members")).toBeVisible();
    await expect(panel.getByText("Owner")).toBeVisible();
    await expect(panel.getByText("Timezone")).toBeVisible();
  });

  test("configuration tab shows slug, timezone, domain fields", async ({
    page,
  }) => {
    await navigateToFirstTenant(page);

    await page.getByRole("tab", { name: "Configuration" }).click();

    const panel = page.locator("[role='tabpanel']");
    await expect(panel.getByText("Slug")).toBeVisible();
    await expect(panel.getByText("Timezone")).toBeVisible();
    await expect(panel.getByText("Custom Domain")).toBeVisible();
    await expect(panel.getByText("Stripe Connect")).toBeVisible();
  });

  test("members tab shows coming soon message", async ({ page }) => {
    await navigateToFirstTenant(page);

    await page.getByRole("tab", { name: "Members" }).click();

    await expect(
      page.getByText("coming in a future iteration"),
    ).toBeVisible();
  });

  test("usage tab shows coming soon message", async ({ page }) => {
    await navigateToFirstTenant(page);

    await page.getByRole("tab", { name: "Usage" }).click();

    await expect(
      page.getByText("coming in a future iteration"),
    ).toBeVisible();
  });

  test("add note and verify it appears", async ({ page }) => {
    await navigateToFirstTenant(page);

    await page.getByRole("tab", { name: "Notes" }).click();

    const noteText = `E2E test note ${Date.now()}`;
    await page.getByPlaceholder("Add an internal note...").fill(noteText);
    await page.getByRole("button", { name: "Add" }).click();

    await expect(page.getByText(noteText)).toBeVisible({ timeout: 10_000 });
  });

  test("suspend dialog: open, cancel, require reason, confirm", async ({
    page,
  }) => {
    await navigateToFirstTenant(page);

    const suspendBtn = page.getByRole("button", { name: "Suspend" });
    const reactivateBtn = page.getByRole("button", { name: "Reactivate" });

    // Determine current state
    const isSuspended = await reactivateBtn.isVisible().catch(() => false);

    if (isSuspended) {
      // Reactivate first so we can test suspend
      await reactivateBtn.click();
      await page.locator("[role='dialog'] input").fill("E2E setup");
      await page
        .locator("[role='dialog']")
        .getByRole("button", { name: "Reactivate" })
        .click();
      await waitForConvex(page);
    }

    // Open suspend dialog
    await page.getByRole("button", { name: "Suspend" }).click();
    const dialog = page.locator("[role='dialog']");
    await expect(dialog).toBeVisible();

    // Confirm button should be disabled without reason
    const confirmBtn = dialog.getByRole("button", { name: "Suspend" });
    await expect(confirmBtn).toBeDisabled();

    // Cancel closes the dialog
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).not.toBeVisible();

    // Open again, fill reason, confirm
    await page.getByRole("button", { name: "Suspend" }).click();
    await page
      .locator("[role='dialog'] input")
      .fill("E2E test suspension");
    await page
      .locator("[role='dialog']")
      .getByRole("button", { name: "Suspend" })
      .click();
    await waitForConvex(page);

    // Status should change — reactivate button should now be visible
    await expect(
      page.getByRole("button", { name: "Reactivate" }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("reactivate flow: confirm and status changes back", async ({
    page,
  }) => {
    await navigateToFirstTenant(page);

    const reactivateBtn = page.getByRole("button", { name: "Reactivate" });
    const suspendBtn = page.getByRole("button", { name: "Suspend" });

    // Ensure tenant is suspended first
    const isAlreadySuspended = await reactivateBtn
      .isVisible()
      .catch(() => false);

    if (!isAlreadySuspended) {
      await suspendBtn.click();
      await page.locator("[role='dialog'] input").fill("E2E setup");
      await page
        .locator("[role='dialog']")
        .getByRole("button", { name: "Suspend" })
        .click();
      await waitForConvex(page);
    }

    // Now reactivate
    await page.getByRole("button", { name: "Reactivate" }).click();
    const dialog = page.locator("[role='dialog']");
    await expect(dialog).toBeVisible();

    await page
      .locator("[role='dialog'] input")
      .fill("E2E test reactivation");
    await page
      .locator("[role='dialog']")
      .getByRole("button", { name: "Reactivate" })
      .click();
    await waitForConvex(page);

    // Suspend button should be visible again
    await expect(page.getByRole("button", { name: "Suspend" })).toBeVisible({
      timeout: 10_000,
    });
  });
});
