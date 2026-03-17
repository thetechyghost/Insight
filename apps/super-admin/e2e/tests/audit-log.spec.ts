import { test, expect } from "../fixtures/base";

test.describe("Audit Log Page", () => {
  test.beforeEach(async ({ auditLogPage }) => {
    await auditLogPage.goto();
  });

  test("page renders with heading and filter controls", async ({ auditLogPage }) => {
    await expect(auditLogPage.page.getByRole("heading", { name: "Audit Log" })).toBeVisible();
    // Filter dropdown should be visible
    await expect(auditLogPage.page.getByRole("combobox")).toBeVisible();
    // Entity filter input should be visible
    await expect(auditLogPage.page.getByPlaceholder("Filter by entity...")).toBeVisible();
  });

  test("table renders with headers", async ({ auditLogPage }) => {
    const headers = auditLogPage.getTableHeaders();
    await expect(headers.filter({ hasText: "Time" })).toBeVisible();
    await expect(headers.filter({ hasText: "Action" })).toBeVisible();
    await expect(headers.filter({ hasText: "Entity" })).toBeVisible();
    await expect(headers.filter({ hasText: "Target ID" })).toBeVisible();
    await expect(headers.filter({ hasText: "Details" })).toBeVisible();
  });

  test("pagination buttons are present", async ({ auditLogPage }) => {
    const firstBtn = auditLogPage.getFirstButton();
    const nextBtn = auditLogPage.getNextButton();

    await expect(firstBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();
    // First button should be disabled on first page
    await expect(firstBtn).toBeDisabled();
  });
});
