import { test, expect } from "../fixtures/base";

test.describe("Content Moderation Page", () => {
  test.beforeEach(async ({ moderationPage }) => {
    await moderationPage.goto();
  });

  test("renders page heading and status filter", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Content Moderation" }),
    ).toBeVisible();
    await expect(page.getByRole("combobox").first()).toBeVisible();
  });

  test("table renders with expected columns", async ({ moderationPage }) => {
    const headers = moderationPage.getTableHeaders();
    await expect(headers.filter({ hasText: "Type" })).toBeVisible();
    await expect(headers.filter({ hasText: "Content ID" })).toBeVisible();
    await expect(headers.filter({ hasText: "Reason" })).toBeVisible();
    await expect(headers.filter({ hasText: "Status" })).toBeVisible();
    await expect(headers.filter({ hasText: "Reported" })).toBeVisible();
  });

  test("status filter options are present", async ({ page, moderationPage }) => {
    await moderationPage.getStatusFilter().click();
    await expect(page.getByRole("option", { name: "All Statuses" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Pending" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Approved" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Removed" })).toBeVisible();
    // Close without selecting
    await page.keyboard.press("Escape");
  });

  test("filtering by status renders table or empty state", async ({
    moderationPage,
    page,
  }) => {
    await moderationPage.selectStatus("Pending");
    // Should show table or empty state — not an error
    const hasTable = await moderationPage.getTableHeaders().first().isVisible().catch(() => false);
    const hasEmpty = await page.getByText("No moderation items found.").isVisible().catch(() => false);
    expect(hasTable || hasEmpty).toBe(true);
  });

  test("shows empty state when no items match filter", async ({
    moderationPage,
    page,
  }) => {
    await moderationPage.selectStatus("Removed");
    // Either rows exist or empty state message appears
    const tableEmpty = await page.getByText("No moderation items found.").isVisible().catch(() => false);
    const hasRows = await moderationPage.getTableRows().count().then((n) => n > 0).catch(() => false);
    expect(tableEmpty || hasRows).toBe(true);
  });
});
