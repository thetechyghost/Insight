import { type Page, type Locator } from "@playwright/test";
import { waitForConvex } from "../fixtures/base";

export class BenchmarksPage {
  readonly page: Page;
  readonly newBenchmarkButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newBenchmarkButton = page.getByRole("button", { name: "New Benchmark" });
  }

  async goto() {
    await this.page.goto("/benchmarks");
    await waitForConvex(this.page);
  }

  getTableRows(): Locator {
    return this.page.locator("tbody tr");
  }

  getTableHeaders(): Locator {
    return this.page.locator("thead th");
  }
}
