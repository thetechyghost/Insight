import { type Page, type Locator } from "@playwright/test";
import { waitForConvex } from "../fixtures/base";

export class SettingsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/settings");
    await waitForConvex(this.page);
  }

  getLowActivityInput(): Locator {
    return this.page.getByLabel("Low Activity (days)");
  }

  getMaxErrorRateInput(): Locator {
    return this.page.getByLabel("Max Error Rate (%)");
  }

  getMinMemberCountInput(): Locator {
    return this.page.getByLabel("Min Member Count");
  }

  getSaveButton(): Locator {
    return this.page.getByRole("button", { name: "Save Thresholds" });
  }
}
