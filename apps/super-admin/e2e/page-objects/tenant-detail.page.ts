import { type Page, type Locator } from "@playwright/test";
import { waitForConvex } from "../fixtures/base";

export class TenantDetailPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(id: string) {
    await this.page.goto(`/tenants/${id}`);
    await waitForConvex(this.page);
  }

  getTenantName(): Locator {
    return this.page.locator("h1");
  }

  getStatusBadge(): Locator {
    // Badge next to the h1 heading
    return this.page.locator("h1 + div, h1 ~ [class*='badge']").first();
  }

  async clickTab(name: string) {
    await this.page.getByRole("tab", { name }).click();
  }

  // Suspend flow
  getSuspendButton(): Locator {
    return this.page.getByRole("button", { name: "Suspend" });
  }

  async clickSuspend() {
    await this.getSuspendButton().click();
  }

  async fillReason(reason: string) {
    // Both suspend and reactivate dialogs use a reason input
    await this.page.locator("[role='dialog'] input").fill(reason);
  }

  getDialogCancelButton(): Locator {
    return this.page
      .locator("[role='dialog']")
      .getByRole("button", { name: "Cancel" });
  }

  async confirmSuspend() {
    await this.page
      .locator("[role='dialog']")
      .getByRole("button", { name: "Suspend" })
      .click();
    await waitForConvex(this.page);
  }

  // Reactivate flow
  getReactivateButton(): Locator {
    return this.page.getByRole("button", { name: "Reactivate" });
  }

  async clickReactivate() {
    await this.getReactivateButton().click();
  }

  async confirmReactivate() {
    await this.page
      .locator("[role='dialog']")
      .getByRole("button", { name: "Reactivate" })
      .click();
    await waitForConvex(this.page);
  }

  // Notes
  getNoteTextarea(): Locator {
    return this.page.getByPlaceholder("Add an internal note...");
  }

  getAddNoteButton(): Locator {
    return this.page.getByRole("button", { name: "Add" });
  }

  async addNote(text: string) {
    await this.getNoteTextarea().fill(text);
    await this.getAddNoteButton().click();
    await waitForConvex(this.page);
  }

  getNotes(): Locator {
    // Notes are cards in the notes tab content
    return this.page.locator("[role='tabpanel'] [class*='card']");
  }
}
