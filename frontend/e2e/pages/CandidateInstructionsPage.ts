import { Page, expect } from '@playwright/test';

export class CandidateInstructionsPage {
  constructor(private page: Page) {}

  async goto(token: string) {
    // Set E2E test mode flag before page loads so face detection is bypassed
    await this.page.addInitScript(() => {
      (window as any).__E2E_TEST_MODE = true;
    });
    await this.page.goto(`/test/${token}`);
    // Wait for token validation to complete — either instructions page or error page
    await this.page.waitForSelector(
      'h1:has-text("Pre-Assessment Verification"), h1:has-text("Assessment Link Invalid")',
      { timeout: 15000 }
    ).catch(() => null);
  }

  async expectTitle() {
    await expect(this.page.getByText(/Pre-Assessment Verification/i)).toBeVisible({ timeout: 15000 });
  }

  async checkConsent() {
    await this.page.getByRole('checkbox').check();
  }

  async clickStart() {
    await this.page.getByRole('button', { name: /Begin Assessment/i }).click();
  }

  async expectError() {
    // Token validation now shows error on page load for invalid/expired/used tokens
    await expect(this.page.getByText(/Assessment Link Invalid|Invalid|expired|already been used/i).first()).toBeVisible({ timeout: 15000 });
  }

  async expectNavigatedToTest() {
    await expect(this.page).toHaveURL(/\/test\/.*\/(aptitude|reasoning|coding)/);
  }

  async completeProctoringChecks() {
    await this.page.context().grantPermissions(['camera', 'microphone']);

    // Step 1: Allow camera & microphone (button has aria-label, use that for matching)
    const cameraBtn = this.page.getByRole('button', { name: /Allow camera and microphone|Recheck devices/i });
    await cameraBtn.waitFor({ state: 'visible', timeout: 15000 });
    await cameraBtn.click();
    await expect(this.page.getByText(/Access granted/i).first()).toBeVisible({ timeout: 10000 });

    // Step 2: Capture face (test mode bypasses real face detection)
    const captureBtn = this.page.getByRole('button', { name: /Capture face for verification/i });
    await captureBtn.click();
    await expect(this.page.getByText(/Face verified/i).first()).toBeVisible({ timeout: 15000 });
  }
}
