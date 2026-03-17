import { test, expect } from "../fixtures/base";

test.describe("Announcements Page", () => {
  test.beforeEach(async ({ announcementsPage }) => {
    await announcementsPage.goto();
  });

  test("page renders with heading and new announcement button", async ({ announcementsPage }) => {
    await expect(announcementsPage.page.getByRole("heading", { name: "Announcements" })).toBeVisible();
    await expect(announcementsPage.newAnnouncementButton).toBeVisible();
  });

  test("status tabs are visible", async ({ announcementsPage, page }) => {
    await expect(page.getByRole("tab", { name: "All" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Draft" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Published" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Archived" })).toBeVisible();
  });

  test("create announcement draft, publish, archive", async ({ announcementsPage, page }) => {
    const uniqueTitle = `E2E-Announcement-${Date.now()}`;

    // Create draft
    await announcementsPage.newAnnouncementButton.click();
    await page.getByLabel("Title").fill(uniqueTitle);
    await page.getByLabel("Content").fill("Test announcement content");
    await page.getByRole("button", { name: "Create Draft" }).click();

    await page.waitForTimeout(1000);
    await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 10_000 });

    // Publish
    const card = page.locator("[data-slot=card]", { hasText: uniqueTitle });
    await card.getByRole("button", { name: "Publish" }).click();
    await page.waitForTimeout(1000);

    // Verify status changed
    await expect(card.getByText("published")).toBeVisible({ timeout: 10_000 });

    // Archive
    await card.getByRole("button", { name: "Archive" }).click();
    await page.waitForTimeout(1000);
    await expect(card.getByText("archived")).toBeVisible({ timeout: 10_000 });
  });

  test("delete draft announcement", async ({ announcementsPage, page }) => {
    const uniqueTitle = `E2E-Del-${Date.now()}`;

    await announcementsPage.newAnnouncementButton.click();
    await page.getByLabel("Title").fill(uniqueTitle);
    await page.getByLabel("Content").fill("To be deleted");
    await page.getByRole("button", { name: "Create Draft" }).click();
    await page.waitForTimeout(1000);

    const card = page.locator("[data-slot=card]", { hasText: uniqueTitle });
    await card.getByRole("button", { name: "Delete" }).click();

    // Confirm deletion
    await page.getByRole("button", { name: "Delete" }).last().click();
    await page.waitForTimeout(1000);
    await expect(page.getByText(uniqueTitle)).not.toBeVisible({ timeout: 10_000 });
  });
});
