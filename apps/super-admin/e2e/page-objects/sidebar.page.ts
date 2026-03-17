import { type Page, type Locator } from "@playwright/test";

export class SidebarPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  getItem(name: string): Locator {
    return this.page
      .locator("[data-sidebar='menu-button']")
      .filter({ hasText: name });
  }

  async navigateTo(name: string) {
    await this.getItem(name).click();
  }

  async isItemActive(name: string): Promise<boolean> {
    const item = this.getItem(name);
    const attr = await item.getAttribute("data-active");
    return attr === "true";
  }

  async isItemDisabled(name: string): Promise<boolean> {
    const item = this.getItem(name);
    const classes = await item.getAttribute("class");
    return classes?.includes("cursor-not-allowed") ?? false;
  }
}
