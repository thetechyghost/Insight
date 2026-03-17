import { type Page, type Locator } from "@playwright/test";
import { waitForConvex } from "../fixtures/base";

export class AnnouncementsPage {
  readonly page: Page;
  readonly newAnnouncementButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newAnnouncementButton = page.getByRole("button", { name: "New Announcement" });
  }

  async goto() {
    await this.page.goto("/announcements");
    await waitForConvex(this.page);
  }

  getCards(): Locator {
    return this.page.locator("[data-slot=card]");
  }

  async clickTab(tab: string) {
    await this.page.getByRole("tab", { name: tab }).click();
    await waitForConvex(this.page);
  }
}
