import { Page, expect } from '@playwright/test';

export class HRDashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/app/hr');
  }

  async clickAddApplicant() {
    await this.page.getByRole('button', { name: /Add Applicant/i }).click();
  }

  async fillApplicantForm(name: string, email: string, resumeUrl?: string) {
    await this.page.getByPlaceholder('Jane Doe').fill(name);
    await this.page.getByPlaceholder('jane@example.com').fill(email);
    if (resumeUrl) {
      await this.page.getByPlaceholder('https://').fill(resumeUrl);
    }
  }

  async submitApplicantForm() {
    await this.page.locator('[role="dialog"]').getByRole('button', { name: /^Add Applicant$/i }).click();
  }

  async shortlistApplicant(name: string) {
    const row = this.page.locator('tr', { hasText: name });
    await row.getByRole('button', { name: /Shortlist/i }).click();
  }

  async rejectApplicant(name: string) {
    const row = this.page.locator('tr', { hasText: name });
    await row.getByRole('button', { name: /Reject/i }).click();
  }

  async sendTestToApplicant(name: string) {
    const row = this.page.locator('tr', { hasText: name });
    await row.getByRole('button', { name: /Send Test/i }).click();
  }

  async fillTemplateId(templateId: string) {
    await this.page.getByPlaceholder('Assessment template UUID').fill(templateId);
  }

  async clickGenerateLink() {
    await this.page.getByRole('button', { name: /Generate.*Copy Link/i }).click();
  }

  async expectApplicantInTable(name: string) {
    await expect(this.page.locator('tr', { hasText: name })).toBeVisible({ timeout: 10000 });
  }

  async expectApplicantStatus(name: string, status: string) {
    const row = this.page.locator('tr', { hasText: name });
    await expect(row.getByText(status)).toBeVisible({ timeout: 10000 });
  }

  async clickSessionsTab() {
    await this.page.getByRole('button', { name: /Sessions/i }).click();
  }

  getToastMessage(text: string) {
    return this.page.getByText(text);
  }
}
