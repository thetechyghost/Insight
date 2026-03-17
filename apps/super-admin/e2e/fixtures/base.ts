import { test as base, type Page } from "@playwright/test";
import { SidebarPage } from "../page-objects/sidebar.page";
import { LoginPage } from "../page-objects/login.page";
import { DashboardPage } from "../page-objects/dashboard.page";
import { TenantsListPage } from "../page-objects/tenants-list.page";
import { TenantDetailPage } from "../page-objects/tenant-detail.page";
import { FeatureFlagsPage } from "../page-objects/feature-flags.page";
import { AuditLogPage } from "../page-objects/audit-log.page";
import { ExercisesPage } from "../page-objects/exercises.page";
import { BenchmarksPage } from "../page-objects/benchmarks.page";
import { AnnouncementsPage } from "../page-objects/announcements.page";

type Fixtures = {
  sidebar: SidebarPage;
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  tenantsListPage: TenantsListPage;
  tenantDetailPage: TenantDetailPage;
  featureFlagsPage: FeatureFlagsPage;
  auditLogPage: AuditLogPage;
  exercisesPage: ExercisesPage;
  benchmarksPage: BenchmarksPage;
  announcementsPage: AnnouncementsPage;
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
  featureFlagsPage: async ({ page }, use) => {
    await use(new FeatureFlagsPage(page));
  },
  auditLogPage: async ({ page }, use) => {
    await use(new AuditLogPage(page));
  },
  exercisesPage: async ({ page }, use) => {
    await use(new ExercisesPage(page));
  },
  benchmarksPage: async ({ page }, use) => {
    await use(new BenchmarksPage(page));
  },
  announcementsPage: async ({ page }, use) => {
    await use(new AnnouncementsPage(page));
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
