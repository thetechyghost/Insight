import { type Page, type Locator } from "@playwright/test";
import { waitForConvex } from "../fixtures/base";

export class ModerationPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/moderation");
    await waitForConvex(this.page);
  }

  getTableRows(): Locator {
    return this.page.locator("tbody tr");
  }

  getTableHeaders(): Locator {
    return this.page.locator("thead th");
  }

  getStatusFilter(): Locator {
    return this.page.locator("[role=combobox]").first();
  }

  async selectStatus(status: string) {
    await this.getStatusFilter().click();
    await this.page.getByRole("option", { name: status }).click();
    await waitForConvex(this.page);
  }

  getApproveButton(rowIndex: number): Locator {
    return this.getTableRows().nth(rowIndex).getByRole("button", { name: "Approve" });
  }

  getRemoveButton(rowIndex: number): Locator {
    return this.getTableRows().nth(rowIndex).getByRole("button", { name: "Remove" });
  }

  getConfirmDialog(): Locator {
    return this.page.locator("[role=dialog]");
  }

  getConfirmButton(): Locator {
    return this.getConfirmDialog().getByRole("button", { name: /Approve|Remove/ }).last();
  }

  getCancelButton(): Locator {
    return this.getConfirmDialog().getByRole("button", { name: "Cancel" });
  }
}
