import { type Page, type Locator } from "@playwright/test";
import { waitForConvex } from "../fixtures/base";

export class TenantsListPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly newTenantButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByPlaceholder("Search tenants...");
    this.newTenantButton = page.getByRole("button", { name: "New Tenant" });
  }

  async goto() {
    await this.page.goto("/tenants");
    await waitForConvex(this.page);
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    // Wait for 300ms debounce + network
    await this.page.waitForTimeout(500);
    await waitForConvex(this.page);
  }

  async selectStatus(status: string) {
    await this.page.getByRole("combobox").click();
    await this.page.getByRole("option", { name: status }).click();
    await waitForConvex(this.page);
  }

  getTableRows(): Locator {
    return this.page.locator("tbody tr");
  }

  getTableHeaders(): Locator {
    return this.page.locator("thead th");
  }

  async clickColumnHeader(name: string) {
    await this.page.locator("thead th").filter({ hasText: name }).click();
  }

  getNextButton(): Locator {
    return this.page.getByRole("button", { name: "Next" });
  }

  getFirstButton(): Locator {
    return this.page.getByRole("button", { name: "First" });
  }

  async clickNext() {
    await this.getNextButton().click();
    await waitForConvex(this.page);
  }

  async clickNewTenant() {
    await this.newTenantButton.click();
  }

  async clickViewTenant(row: number) {
    await this.getTableRows().nth(row).getByText("View").click();
  }

  // Tenant create sheet helpers
  getSheetTitle(): Locator {
    return this.page.getByText("Create New Tenant");
  }

  async fillGymName(name: string) {
    await this.page.getByPlaceholder("CrossFit Bergen").fill(name);
  }

  getSlugInput(): Locator {
    return this.page.getByPlaceholder("crossfit-bergen");
  }

  async fillOwnerEmail(email: string) {
    await this.page.getByPlaceholder("owner@gym.com").fill(email);
  }

  async fillTimezone(tz: string) {
    await this.page.getByPlaceholder("Europe/Oslo").fill(tz);
  }

  getCreateButton(): Locator {
    return this.page.getByRole("button", { name: "Create Tenant" });
  }

  getFormError(text: string): Locator {
    return this.page.getByText(text);
  }
}
