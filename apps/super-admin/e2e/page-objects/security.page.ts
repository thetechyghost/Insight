import { type Page, type Locator } from "@playwright/test";
import { waitForConvex } from "../fixtures/base";

export class SecurityEventsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/security");
    await waitForConvex(this.page);
  }

  getTableRows(): Locator {
    return this.page.locator("tbody tr");
  }

  getTableHeaders(): Locator {
    return this.page.locator("thead th");
  }

  getStatCards(): Locator {
    return this.page.locator("[data-slot=card]");
  }

  getEventTypeFilter(): Locator {
    return this.page.locator("[role=combobox]").first();
  }

  async selectEventType(type: string) {
    await this.getEventTypeFilter().click();
    await this.page.getByRole("option", { name: type }).click();
    await waitForConvex(this.page);
  }
}

export class ApiKeysPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/security/api-keys");
    await waitForConvex(this.page);
  }

  getTableRows(): Locator {
    return this.page.locator("tbody tr");
  }

  getTableHeaders(): Locator {
    return this.page.locator("thead th");
  }
}
