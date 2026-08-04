import { Page, expect } from '@playwright/test';

export class RegisterPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/register');
  }

  async fillOrgName(name: string) {
    await this.page.getByPlaceholder('Acme Corp').fill(name);
  }

  async fillEmail(email: string) {
    await this.page.getByPlaceholder('you@company.com').fill(email);
  }

  async fillPassword(password: string) {
    await this.page.getByPlaceholder('At least 8 characters').fill(password);
  }

  async selectRole(role: string) {
    await this.page.getByRole('combobox').selectOption(role);
  }

  async submit() {
    await this.page.getByRole('button', { name: /Create Account/i }).click();
  }

  async expectErrorMessage(message: string) {
    await expect(this.page.getByText(message)).toBeVisible({ timeout: 10000 });
  }

  async expectNavigatedToDashboard() {
    await expect(this.page).toHaveURL(/\/app/);
  }
}
