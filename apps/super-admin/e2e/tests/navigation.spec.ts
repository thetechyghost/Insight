import { test, expect } from "../fixtures/base";
import { waitForConvex } from "../fixtures/base";

test.describe("Sidebar Navigation", () => {
  test("navigates from dashboard to tenants via sidebar", async ({
    page,
    sidebar,
  }) => {
    await page.goto("/dashboard");
    await waitForConvex(page);

    await sidebar.navigateTo("Tenants");
    await expect(page).toHaveURL(/\/tenants/);
    await expect(page.getByRole("heading", { name: "Tenants" })).toBeVisible();
  });

  test("navigates from tenants to dashboard via sidebar", async ({
    page,
    sidebar,
  }) => {
    await page.goto("/tenants");
    await waitForConvex(page);

    await sidebar.navigateTo("Dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole("heading", { name: "Platform Dashboard" }),
    ).toBeVisible();
  });

  test("highlights active sidebar item", async ({ page, sidebar }) => {
    await page.goto("/dashboard");
    await waitForConvex(page);

    expect(await sidebar.isItemActive("Dashboard")).toBe(true);
    expect(await sidebar.isItemActive("Tenants")).toBe(false);

    await sidebar.navigateTo("Tenants");
    await expect(page).toHaveURL(/\/tenants/);

    expect(await sidebar.isItemActive("Tenants")).toBe(true);
    expect(await sidebar.isItemActive("Dashboard")).toBe(false);
  });

  test("disabled items (Billing, Settings, Audit Log) are not navigable", async ({
    page,
    sidebar,
  }) => {
    await page.goto("/dashboard");
    await waitForConvex(page);

    for (const item of ["Billing", "Settings", "Audit Log"]) {
      expect(await sidebar.isItemDisabled(item)).toBe(true);
    }
  });
});
