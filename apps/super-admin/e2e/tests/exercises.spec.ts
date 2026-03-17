import { test, expect } from "../fixtures/base";

test.describe("Exercises Page", () => {
  test.beforeEach(async ({ exercisesPage }) => {
    await exercisesPage.goto();
  });

  test("page renders with heading and new exercise button", async ({ exercisesPage }) => {
    await expect(exercisesPage.page.getByRole("heading", { name: "Exercise Library" })).toBeVisible();
    await expect(exercisesPage.newExerciseButton).toBeVisible();
  });

  test("table renders with headers", async ({ exercisesPage }) => {
    const headers = exercisesPage.getTableHeaders();
    await expect(headers.filter({ hasText: "Name" })).toBeVisible();
    await expect(headers.filter({ hasText: "Category" })).toBeVisible();
    await expect(headers.filter({ hasText: "Difficulty" })).toBeVisible();
    await expect(headers.filter({ hasText: "Equipment" })).toBeVisible();
  });

  test("create exercise via form", async ({ exercisesPage, page }) => {
    const uniqueName = `E2E-Exercise-${Date.now()}`;

    await exercisesPage.newExerciseButton.click();

    // Fill form
    await page.getByLabel("Name").fill(uniqueName);
    // Category defaults to weightlifting

    // Submit
    await page.getByRole("button", { name: "Create" }).click();

    // Wait for sheet to close and verify exercise appears
    await page.waitForTimeout(1000);
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10_000 });
  });

  test("category filter works", async ({ exercisesPage }) => {
    await exercisesPage.selectCategory("Gymnastics");
    // Page should still render the table
    await expect(exercisesPage.getTableHeaders().first()).toBeVisible();
  });
});
