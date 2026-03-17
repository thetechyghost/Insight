import { type Page, type Locator } from "@playwright/test";
import { waitForConvex } from "../fixtures/base";

export class DashboardPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/dashboard");
    await this.waitForLoad();
  }

  async waitForLoad() {
    await waitForConvex(this.page);
  }

  getStatCard(title: string): Locator {
    return this.page
      .locator("[class*='card']")
      .filter({ hasText: title })
      .first();
  }

  getGrowthChart(): Locator {
    return this.page.locator(".recharts-responsive-container").first();
  }

  getSystemStatusSection(): Locator {
    return this.page
      .locator("[class*='card']")
      .filter({ hasText: "System Status" });
  }

  getHealthFlagsSection(): Locator {
    return this.page
      .locator("[class*='card']")
      .filter({ hasText: "Tenant Health Flags" });
  }
}
