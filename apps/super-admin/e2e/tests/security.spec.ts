import { test, expect } from "../fixtures/base";

test.describe("Security Events Page", () => {
  test.beforeEach(async ({ securityEventsPage }) => {
    await securityEventsPage.goto();
  });

  test("renders page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Security Events" }),
    ).toBeVisible();
  });

  test("table renders with expected columns", async ({ securityEventsPage }) => {
    const headers = securityEventsPage.getTableHeaders();
    await expect(headers.filter({ hasText: "Timestamp" })).toBeVisible();
    await expect(headers.filter({ hasText: "Event Type" })).toBeVisible();
  });

  test("event type filter renders", async ({ page }) => {
    await expect(page.getByRole("combobox").first()).toBeVisible();
  });

  test("stat cards are rendered", async ({ securityEventsPage }) => {
    const cards = securityEventsPage.getStatCards();
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("filtering by event type does not break the page", async ({
    securityEventsPage,
    page,
  }) => {
    await securityEventsPage.getEventTypeFilter().click();
    const options = page.getByRole("option");
    const count = await options.count();
    // At least "All Types" option is present
    expect(count).toBeGreaterThanOrEqual(1);
    await page.keyboard.press("Escape");
  });
});

test.describe("API Keys Page", () => {
  test.beforeEach(async ({ apiKeysPage }) => {
    await apiKeysPage.goto();
  });

  test("renders page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "API Keys" }),
    ).toBeVisible();
  });

  test("table renders with expected columns", async ({ apiKeysPage }) => {
    const headers = apiKeysPage.getTableHeaders();
    await expect(headers.filter({ hasText: "Name" })).toBeVisible();
    await expect(headers.filter({ hasText: "Tenant" })).toBeVisible();
  });

  test("table shows rows or empty state", async ({ apiKeysPage, page }) => {
    const hasRows = await apiKeysPage.getTableRows().count().then((n) => n > 0).catch(() => false);
    const hasEmpty = await page.getByText("No API keys found.").isVisible().catch(() => false);
    expect(hasRows || hasEmpty).toBe(true);
  });
});
