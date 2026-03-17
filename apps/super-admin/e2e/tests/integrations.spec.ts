import { test, expect } from "../fixtures/base";

test.describe("Integrations Page", () => {
  test.beforeEach(async ({ integrationsPage }) => {
    await integrationsPage.goto();
  });

  test("renders page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Integrations" }),
    ).toBeVisible();
  });

  test("tabs are present", async ({ page }) => {
    await expect(page.getByRole("tab", { name: "Connections" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Webhooks" })).toBeVisible();
  });

  test("Connections tab renders table", async ({ integrationsPage, page }) => {
    await integrationsPage.clickTab("Connections");
    const headers = integrationsPage.getTableHeaders();
    const count = await headers.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("Webhooks tab renders table", async ({ integrationsPage, page }) => {
    await integrationsPage.clickTab("Webhooks");
    const headers = integrationsPage.getTableHeaders();
    const count = await headers.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("Connections tab shows rows or empty state", async ({
    integrationsPage,
    page,
  }) => {
    await integrationsPage.clickTab("Connections");
    const hasRows =
      await integrationsPage.getTableRows().count().then((n) => n > 0).catch(() => false);
    const hasEmpty = await page.getByText(/No .* found/).isVisible().catch(() => false);
    expect(hasRows || hasEmpty).toBe(true);
  });

  test("Webhooks tab shows rows or empty state", async ({
    integrationsPage,
    page,
  }) => {
    await integrationsPage.clickTab("Webhooks");
    const hasRows =
      await integrationsPage.getTableRows().count().then((n) => n > 0).catch(() => false);
    const hasEmpty = await page.getByText(/No .* found/).isVisible().catch(() => false);
    expect(hasRows || hasEmpty).toBe(true);
  });
});
