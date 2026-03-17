import { type Page, type Locator } from "@playwright/test";
import { waitForConvex } from "../fixtures/base";

export class AuditLogPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/audit-log");
    await waitForConvex(this.page);
  }

  getTableRows(): Locator {
    return this.page.locator("tbody tr");
  }

  getTableHeaders(): Locator {
    return this.page.locator("thead th");
  }

  async filterByAction(action: string) {
    await this.page.getByRole("combobox").click();
    await this.page.getByRole("option", { name: action }).click();
    await waitForConvex(this.page);
  }

  async filterByEntity(entity: string) {
    await this.page.getByPlaceholder("Filter by entity...").fill(entity);
    await waitForConvex(this.page);
  }

  getNextButton(): Locator {
    return this.page.getByRole("button", { name: "Next" });
  }

  getFirstButton(): Locator {
    return this.page.getByRole("button", { name: "First" });
  }
}
