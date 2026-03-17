import { test, expect } from "../fixtures/base";

test.describe("Benchmarks Page", () => {
  test.beforeEach(async ({ benchmarksPage }) => {
    await benchmarksPage.goto();
  });

  test("page renders with heading and new benchmark button", async ({ benchmarksPage }) => {
    await expect(benchmarksPage.page.getByRole("heading", { name: "Benchmark Workouts" })).toBeVisible();
    await expect(benchmarksPage.newBenchmarkButton).toBeVisible();
  });

  test("table renders with headers", async ({ benchmarksPage }) => {
    const headers = benchmarksPage.getTableHeaders();
    await expect(headers.filter({ hasText: "Name" })).toBeVisible();
    await expect(headers.filter({ hasText: "Type" })).toBeVisible();
    await expect(headers.filter({ hasText: "Category" })).toBeVisible();
    await expect(headers.filter({ hasText: "Scoring" })).toBeVisible();
    await expect(headers.filter({ hasText: "Movements" })).toBeVisible();
  });

  test("create benchmark via form", async ({ benchmarksPage, page }) => {
    const uniqueName = `E2E-Benchmark-${Date.now()}`;

    await benchmarksPage.newBenchmarkButton.click();

    await page.getByLabel("Name").fill(uniqueName);
    await page.getByPlaceholder("ForTime, AMRAP, etc.").fill("ForTime");
    // Fill first movement
    await page.getByPlaceholder("Exercise name").fill("Thruster");
    await page.getByPlaceholder("Reps").fill("21");

    await page.getByRole("button", { name: "Create" }).click();

    await page.waitForTimeout(1000);
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10_000 });
  });
});
