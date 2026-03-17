import { type Page, type Locator } from "@playwright/test";
import { waitForConvex } from "../fixtures/base";

export class ExercisesPage {
  readonly page: Page;
  readonly newExerciseButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newExerciseButton = page.getByRole("button", { name: "New Exercise" });
  }

  async goto() {
    await this.page.goto("/exercises");
    await waitForConvex(this.page);
  }

  getTableRows(): Locator {
    return this.page.locator("tbody tr");
  }

  getTableHeaders(): Locator {
    return this.page.locator("thead th");
  }

  async search(query: string) {
    await this.page.getByPlaceholder("Search exercises...").fill(query);
    await this.page.waitForTimeout(500);
    await waitForConvex(this.page);
  }

  async selectCategory(category: string) {
    await this.page.locator("[role=combobox]").last().click();
    await this.page.getByRole("option", { name: category }).click();
    await waitForConvex(this.page);
  }
}
