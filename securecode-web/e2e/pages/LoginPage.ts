import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async fillOrgId(orgId: string) {
    await this.page.getByPlaceholder('Enter your org UUID').fill(orgId);
  }

  async fillEmail(email: string) {
    await this.page.getByPlaceholder('you@company.com').fill(email);
  }

  async fillPassword(password: string) {
    await this.page.getByPlaceholder('••••••••').fill(password);
  }

  async submit() {
    await this.page.getByRole('button', { name: /Sign In/i }).click();
  }

  async expectErrorMessage(message: string) {
    await expect(this.page.getByText(message)).toBeVisible({ timeout: 10000 });
  }

  async expectNavigatedToDashboard() {
    await expect(this.page).toHaveURL(/\/app/);
  }
}
