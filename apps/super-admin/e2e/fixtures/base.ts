import { test as base, type Page } from "@playwright/test";
import { SidebarPage } from "../page-objects/sidebar.page";
import { LoginPage } from "../page-objects/login.page";
import { DashboardPage } from "../page-objects/dashboard.page";
import { TenantsListPage } from "../page-objects/tenants-list.page";
import { TenantDetailPage } from "../page-objects/tenant-detail.page";

type Fixtures = {
  sidebar: SidebarPage;
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  tenantsListPage: TenantsListPage;
  tenantDetailPage: TenantDetailPage;
};

export const test = base.extend<Fixtures>({
  sidebar: async ({ page }, use) => {
    await use(new SidebarPage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  tenantsListPage: async ({ page }, use) => {
    await use(new TenantsListPage(page));
  },
  tenantDetailPage: async ({ page }, use) => {
    await use(new TenantDetailPage(page));
  },
});

export { expect } from "@playwright/test";

/**
 * Wait for Convex real-time data to load by waiting for "Loading..." to disappear.
 */
export async function waitForConvex(page: Page) {
  await page.waitForFunction(
    () => !document.body.textContent?.includes("Loading..."),
    { timeout: 15_000 },
  );
}
