import { type Page, type Locator } from "@playwright/test";
import { waitForConvex } from "../fixtures/base";

export class IntegrationsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/integrations");
    await waitForConvex(this.page);
  }

  async clickTab(tab: string) {
    await this.page.getByRole("tab", { name: tab }).click();
    await waitForConvex(this.page);
  }

  getTableRows(): Locator {
    return this.page.locator("tbody tr");
  }

  getTableHeaders(): Locator {
    return this.page.locator("thead th");
  }
}
