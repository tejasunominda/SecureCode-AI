import { Page, expect } from '@playwright/test';

export class CandidateTestPage {
  constructor(private page: Page) {}

  async gotoSection(sessionId: string, section: string) {
    await this.page.goto(`/test/${sessionId}/${section}`);
  }

  async expectSectionLabel(section: string) {
    await expect(this.page.getByText(new RegExp(section, 'i')).first()).toBeVisible();
  }

  async selectAnswer(optionKey: string) {
    await this.page.locator(`button:has-text(${optionKey})`).first().click();
  }

  async clickNext() {
    await this.page.getByRole('button', { name: /Next/i }).click();
  }

  async clickPrevious() {
    await this.page.getByRole('button', { name: /Previous/i }).click();
  }

  async clickSubmitSection() {
    await this.page.getByRole('button', { name: /Submit Section/i }).click();
  }

  async clickSubmitTest() {
    await this.page.getByRole('button', { name: /Submit Test/i }).click();
  }

  async fillCode(code: string) {
    const editor = this.page.locator('textarea');
    await editor.fill(code);
  }

  async selectLanguage(language: string) {
    await this.page.locator('select').first().selectOption(language);
  }

  async clickRunAndSubmit() {
    await this.page.getByRole('button', { name: /Run.*Submit/i }).click();
  }

  async expectTimerVisible() {
    await expect(this.page.locator('text=/\\d+:\\d{2}/').first()).toBeVisible();
  }

  async expectSubmitted() {
    await expect(this.page.getByRole('heading', { name: 'Test Submitted' })).toBeVisible({ timeout: 10000 });
  }

  async expectTerminated() {
    await expect(this.page.getByText(/Test Terminated/i)).toBeVisible({ timeout: 10000 });
  }
}
