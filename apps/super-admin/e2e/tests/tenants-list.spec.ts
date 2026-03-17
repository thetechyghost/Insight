import { test, expect } from "../fixtures/base";

test.describe("Tenants List Page", () => {
  test.beforeEach(async ({ tenantsListPage }) => {
    await tenantsListPage.goto();
  });

  test("table renders with headers and data rows", async ({
    tenantsListPage,
  }) => {
    const headers = tenantsListPage.getTableHeaders();
    await expect(headers.filter({ hasText: "Name" })).toBeVisible();
    await expect(headers.filter({ hasText: "Status" })).toBeVisible();
    await expect(headers.filter({ hasText: "Members" })).toBeVisible();
    await expect(headers.filter({ hasText: "Created" })).toBeVisible();

    const rows = tenantsListPage.getTableRows();
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("search filters tenants with debounce", async ({
    tenantsListPage,
  }) => {
    const rowsBefore = await tenantsListPage.getTableRows().count();

    // Search for a string unlikely to match all tenants
    await tenantsListPage.search("zzz_no_match_expected");

    const rowsAfter = await tenantsListPage.getTableRows().count();
    // Either fewer rows or the "No tenants found" message
    const noResults = tenantsListPage.page.getByText("No tenants found.");
    const hasNoResults = await noResults.isVisible().catch(() => false);

    expect(rowsAfter < rowsBefore || hasNoResults).toBe(true);
  });

  test("status filter dropdown works", async ({ tenantsListPage }) => {
    await tenantsListPage.selectStatus("Active");
    // After filtering, page should still show the table
    await expect(tenantsListPage.getTableHeaders().first()).toBeVisible();
  });

  test("column sorting toggles", async ({ tenantsListPage }) => {
    await tenantsListPage.clickColumnHeader("Name");
    // Verify table is still rendered (sorting doesn't break anything)
    await expect(tenantsListPage.getTableHeaders().first()).toBeVisible();
  });

  test("pagination buttons are present", async ({ tenantsListPage }) => {
    const firstBtn = tenantsListPage.getFirstButton();
    const nextBtn = tenantsListPage.getNextButton();

    await expect(firstBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();

    // First button should be disabled on first page
    await expect(firstBtn).toBeDisabled();
  });

  test("New Tenant sheet opens with form", async ({ tenantsListPage }) => {
    await tenantsListPage.clickNewTenant();

    await expect(tenantsListPage.getSheetTitle()).toBeVisible();
    await expect(
      tenantsListPage.page.getByPlaceholder("CrossFit Bergen"),
    ).toBeVisible();
    await expect(tenantsListPage.getCreateButton()).toBeVisible();
  });

  test("form validation shows error for short name", async ({
    tenantsListPage,
  }) => {
    await tenantsListPage.clickNewTenant();

    // Type a single character and blur to trigger validation
    await tenantsListPage.fillGymName("A");
    await tenantsListPage.getSlugInput().click(); // blur name field

    await expect(tenantsListPage.getFormError("Min 2 chars")).toBeVisible();
  });

  test("create tenant E2E: fill form, submit, navigate to detail", async ({
    tenantsListPage,
    page,
  }) => {
    const uniqueName = `E2E-Gym-${Date.now()}`;
    await tenantsListPage.clickNewTenant();

    await tenantsListPage.fillGymName(uniqueName);
    await tenantsListPage.fillOwnerEmail("e2e@test.com");
    await tenantsListPage.fillTimezone("Europe/Oslo");

    await tenantsListPage.getCreateButton().click();

    // Should navigate to the new tenant's detail page
    await expect(page).toHaveURL(/\/tenants\//, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: uniqueName })).toBeVisible({
      timeout: 10_000,
    });
  });
});
