import { Page, expect } from '@playwright/test';

export class CandidateInstructionsPage {
  constructor(private page: Page) {}

  async goto(token: string) {
    await this.page.goto(`/test/${token}`);
  }

  async expectTitle() {
    await expect(this.page.getByText(/Fresher Hiring Assessment/i)).toBeVisible();
  }

  async checkConsent() {
    await this.page.getByRole('checkbox').check();
  }

  async clickStart() {
    await this.page.getByRole('button', { name: /Begin Assessment/i }).click();
  }

  async expectError() {
    await expect(this.page.getByText(/Failed to start test|Invalid|expired/i).first()).toBeVisible({ timeout: 10000 });
  }

  async expectNavigatedToTest() {
    await expect(this.page).toHaveURL(/\/test\/.*\/(aptitude|reasoning|coding)/);
  }
}
