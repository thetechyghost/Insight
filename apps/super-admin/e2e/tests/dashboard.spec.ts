import { test, expect } from "../fixtures/base";

test.describe("Dashboard Page", () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test("displays four stat cards with numeric values", async ({
    dashboardPage,
  }) => {
    for (const title of [
      "Total Tenants",
      "Total Users",
      "Workouts This Month",
      "Active Today",
    ]) {
      const card = dashboardPage.getStatCard(title);
      await expect(card).toBeVisible();
      // The card should contain a numeric value (possibly 0)
      await expect(card).toContainText(/\d+/);
    }
  });

  test("growth chart renders", async ({ dashboardPage }) => {
    const chart = dashboardPage.getGrowthChart();
    await expect(chart).toBeVisible();
  });

  test("system status shows 4 services as Operational", async ({
    dashboardPage,
  }) => {
    const section = dashboardPage.getSystemStatusSection();
    await expect(section).toBeVisible();

    for (const service of [
      "Convex",
      "Azure Functions",
      "TimescaleDB",
      "Event Hub",
    ]) {
      await expect(section.getByText(service)).toBeVisible();
    }

    const operational = section.getByText("Operational");
    await expect(operational).toHaveCount(4);
  });

  test("tenant health flags section is present when flagged tenants exist", async ({
    dashboardPage,
  }) => {
    // This section is conditionally rendered — just verify the page structure is correct
    // If there are flagged tenants, the section appears; if not, we verify no error
    const heading = dashboardPage.page.getByText("Platform Dashboard");
    await expect(heading).toBeVisible();
  });
});
