import { type Page, type Locator } from "@playwright/test";
import { waitForConvex } from "../fixtures/base";

export class FeatureFlagsPage {
  readonly page: Page;
  readonly newFlagButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newFlagButton = page.getByRole("button", { name: "New Flag" });
  }

  async goto() {
    await this.page.goto("/feature-flags");
    await waitForConvex(this.page);
  }

  getTableRows(): Locator {
    return this.page.locator("tbody tr");
  }

  getTableHeaders(): Locator {
    return this.page.locator("thead th");
  }

  async clickNewFlag() {
    await this.newFlagButton.click();
  }

  async fillFlagName(name: string) {
    await this.page.getByLabel("Name").fill(name);
  }

  async selectStatus(status: string) {
    await this.page.getByLabel("Status").click();
    await this.page.getByRole("option", { name: status }).click();
  }

  async fillRolloutPercentage(pct: string) {
    await this.page.getByLabel("Rollout Percentage").fill(pct);
  }

  getCreateButton(): Locator {
    return this.page.getByRole("button", { name: "Create" });
  }

  getSaveButton(): Locator {
    return this.page.getByRole("button", { name: "Save" });
  }

  getDeleteButton(): Locator {
    return this.page.getByRole("button", { name: "Delete" }).last();
  }

  async clickEditOnRow(index: number) {
    await this.getTableRows().nth(index).getByText("Edit").click();
  }

  async clickDeleteOnRow(index: number) {
    await this.getTableRows().nth(index).getByText("Delete").click();
  }
}
