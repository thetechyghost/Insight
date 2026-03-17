import { type Page, type Locator } from "@playwright/test";
import { waitForConvex } from "../fixtures/base";

export class ProvisionPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/tenants/provision");
    await waitForConvex(this.page);
  }

  getHeading(): Locator {
    return this.page.getByRole("heading", { name: "Provision New Tenant" });
  }

  getNextButton(): Locator {
    return this.page.getByRole("button", { name: "Next" });
  }

  getBackButton(): Locator {
    return this.page.getByRole("button", { name: "Back" });
  }

  getSubmitButton(): Locator {
    return this.page.getByRole("button", { name: "Provision Tenant" });
  }

  async fillBusinessName(name: string) {
    await this.page.getByLabel("Business Name").fill(name);
  }

  async fillSlug(slug: string) {
    await this.page.getByLabel("Slug").fill(slug);
  }

  async fillContactEmail(email: string) {
    await this.page.getByLabel("Contact Email").fill(email);
  }

  async goToNextStep() {
    await this.getNextButton().click();
  }

  async goToPreviousStep() {
    await this.getBackButton().click();
  }

  getStepIndicator(): Locator {
    return this.page.locator("[data-step]");
  }
}
