import { type Page, type Locator } from "@playwright/test";
import { waitForConvex } from "../fixtures/base";

export class CompliancePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/compliance");
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

  getStatusFilter(): Locator {
    return this.page.locator("[role=combobox]").first();
  }

  async selectStatus(status: string) {
    await this.getStatusFilter().click();
    await this.page.getByRole("option", { name: status }).click();
    await waitForConvex(this.page);
  }
}

export class LegalDocumentsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/compliance/legal-documents");
    await waitForConvex(this.page);
  }

  getTableRows(): Locator {
    return this.page.locator("tbody tr");
  }

  getTableHeaders(): Locator {
    return this.page.locator("thead th");
  }

  getNewDocumentButton(): Locator {
    return this.page.getByRole("button", { name: "New Document" });
  }

  async clickNewDocument() {
    await this.getNewDocumentButton().click();
  }

  getSheetTitle(): Locator {
    return this.page.getByText("New Legal Document");
  }

  getSaveButton(): Locator {
    return this.page.getByRole("button", { name: "Create" });
  }
}

export class AgeVerificationPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/compliance/age-verification");
    await waitForConvex(this.page);
  }

  getTableRows(): Locator {
    return this.page.locator("tbody tr");
  }

  getTableHeaders(): Locator {
    return this.page.locator("thead th");
  }
}
