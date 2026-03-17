import { test, expect } from "../fixtures/base";

test.describe("Compliance — Data Requests & Consent Audit", () => {
  test.beforeEach(async ({ compliancePage }) => {
    await compliancePage.goto();
  });

  test("renders page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Compliance" }),
    ).toBeVisible();
  });

  test("tabs are present", async ({ page }) => {
    await expect(page.getByRole("tab", { name: "Data Requests" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Consent Audit" })).toBeVisible();
  });

  test("Data Requests tab renders table", async ({ compliancePage, page }) => {
    await compliancePage.clickTab("Data Requests");
    const headers = compliancePage.getTableHeaders();
    await expect(headers.filter({ hasText: "Type" })).toBeVisible();
    await expect(headers.filter({ hasText: "Status" })).toBeVisible();
  });

  test("Consent Audit tab renders table", async ({ compliancePage, page }) => {
    await compliancePage.clickTab("Consent Audit");
    const headers = compliancePage.getTableHeaders();
    // table should be visible with at least one header
    const count = await headers.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("status filter is present on Data Requests tab", async ({
    compliancePage,
    page,
  }) => {
    await compliancePage.clickTab("Data Requests");
    await expect(page.getByRole("combobox").first()).toBeVisible();
  });
});

test.describe("Compliance — Legal Documents", () => {
  test.beforeEach(async ({ legalDocumentsPage }) => {
    await legalDocumentsPage.goto();
  });

  test("renders page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Legal Documents" }),
    ).toBeVisible();
  });

  test("table renders with expected columns", async ({ legalDocumentsPage }) => {
    const headers = legalDocumentsPage.getTableHeaders();
    await expect(headers.filter({ hasText: "Type" })).toBeVisible();
    await expect(headers.filter({ hasText: "Version" })).toBeVisible();
  });

  test("New Document button is present", async ({ legalDocumentsPage }) => {
    await expect(legalDocumentsPage.getNewDocumentButton()).toBeVisible();
  });

  test("New Document sheet opens on button click", async ({
    legalDocumentsPage,
    page,
  }) => {
    await legalDocumentsPage.clickNewDocument();
    await expect(legalDocumentsPage.getSheetTitle()).toBeVisible();
  });
});

test.describe("Compliance — Age Verification", () => {
  test.beforeEach(async ({ ageVerificationPage }) => {
    await ageVerificationPage.goto();
  });

  test("renders page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Age Verification" }),
    ).toBeVisible();
  });

  test("table renders with expected columns", async ({ ageVerificationPage }) => {
    const headers = ageVerificationPage.getTableHeaders();
    const count = await headers.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("shows table or empty state", async ({ ageVerificationPage, page }) => {
    const hasRows =
      await ageVerificationPage.getTableRows().count().then((n) => n > 0).catch(() => false);
    const hasEmpty = await page.getByText(/No .* found/).isVisible().catch(() => false);
    expect(hasRows || hasEmpty).toBe(true);
  });
});
