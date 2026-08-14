import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { registerAndAuth, createApplicant, uniqueEmail } from '../helpers/api';

async function loginViaUI(page: Page, orgId: string, email: string, password: string) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.fillOrgId(orgId);
  await loginPage.fillEmail(email);
  await loginPage.fillPassword(password);
  await loginPage.submit();
  await loginPage.expectNavigatedToDashboard();
}

test.describe('Feature 5: New Pages & Enhanced Features', () => {
  test('Dashboard shows real stats and quick action cards', async ({ page, request }) => {
    const email = uniqueEmail('dash');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'DashCorp', 'HR');

    // Create applicants via API
    for (let i = 0; i < 3; i++) {
      await createApplicant(request, auth.accessToken, auth.orgId, `Dash User ${i}`, uniqueEmail(`du${i}`));
    }

    // Login via UI (HR users get redirected to /app/hr)
    await loginViaUI(page, auth.orgId, email, password);
    await page.goto('/app');

    // Check stats are visible
    await expect(page.getByText('Total Applicants')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Active Sessions')).toBeVisible();
    await expect(page.getByText('Pass Rate')).toBeVisible();
    await expect(page.getByText('Pending Decisions')).toBeVisible();

    // Check quick action cards (scope to main to avoid sidebar matches)
    const main = page.getByRole('main');
    await expect(main.getByText('HR Dashboard', { exact: true })).toBeVisible();
    await expect(main.getByText('Question Bank', { exact: true })).toBeVisible();
    await expect(main.getByText('Analytics', { exact: true })).toBeVisible();
    await expect(main.getByText('Settings', { exact: true })).toBeVisible();

    // Check account info
    await expect(page.getByText('Organization ID')).toBeVisible();
    await expect(page.getByText('Roles')).toBeVisible();
  });

  test('HR Dashboard has search, filter, sort, pagination, and export', async ({ page, request }) => {
    const email = uniqueEmail('hrd');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'HRDashCorp', 'HR');

    // Create applicants
    for (let i = 0; i < 5; i++) {
      await createApplicant(request, auth.accessToken, auth.orgId, `Search User ${i}`, uniqueEmail(`su${i}`));
    }

    await loginViaUI(page, auth.orgId, email, password);
    await page.goto('/app/hr');

    // Wait for applicants to load
    await expect(page.getByText('Search User 0')).toBeVisible({ timeout: 10000 });

    // Search box visible
    await expect(page.getByPlaceholder('Search by name or email...')).toBeVisible();

    // Export button visible
    await expect(page.getByRole('button', { name: /Export/i }).first()).toBeVisible();

    // Type in search to filter
    await page.getByPlaceholder('Search by name or email...').fill('User 3');
    await page.waitForTimeout(500);
    await expect(page.getByText('Search User 3')).toBeVisible();
    await expect(page.getByText('Search User 0')).not.toBeVisible({ timeout: 3000 });

    // Clear search
    await page.getByPlaceholder('Search by name or email...').fill('');
    await page.waitForTimeout(500);

    // Switch to Sessions tab
    await page.getByRole('button', { name: /Sessions/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByPlaceholder('Search sessions...')).toBeVisible();
  });

  test('Question Bank page loads with create and import buttons', async ({ page, request }) => {
    const email = uniqueEmail('qb');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'QBCorp', 'HR');

    await loginViaUI(page, auth.orgId, email, password);
    await page.goto('/app/questions');

    // Title
    await expect(page.getByRole('heading', { name: 'Question Bank' })).toBeVisible({ timeout: 10000 });

    // Buttons
    await expect(page.getByRole('button', { name: /New Question/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Import/i })).toBeVisible();

    // Search
    await expect(page.getByPlaceholder('Search questions...')).toBeVisible();

    // Click New Question
    await page.getByRole('button', { name: /New Question/i }).click();
    await expect(page.getByRole('heading', { name: 'Create Question' })).toBeVisible({ timeout: 5000 });
    // Scope to modal to avoid table header matches
    const modal = page.getByLabel('Create Question');
    await expect(modal.getByText('Question Body')).toBeVisible();
    await expect(modal.getByText('Type', { exact: true })).toBeVisible();
    await expect(modal.getByText('Difficulty', { exact: true })).toBeVisible();
    await expect(modal.getByText('Tags (comma-separated)')).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: /Cancel/i }).click();
  });

  test('Question Bank can create a question via UI', async ({ page, request }) => {
    const email = uniqueEmail('qc');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'QCCorp', 'HR');

    await loginViaUI(page, auth.orgId, email, password);
    await page.goto('/app/questions');

    await page.getByRole('button', { name: /New Question/i }).click();
    await expect(page.getByRole('heading', { name: 'Create Question' })).toBeVisible({ timeout: 5000 });

    // Fill form
    await page.getByPlaceholder('Enter the question...').fill('What is the capital of France?');
    await page.getByLabel('Option A').fill('London');
    await page.getByLabel('Option B').fill('Paris');
    await page.getByLabel('Option C').fill('Berlin');
    await page.getByLabel('Option D').fill('Madrid');
    await page.getByPlaceholder('arrays, sorting, dynamic-programming').fill('geography, capitals');

    // Submit
    await page.getByRole('button', { name: /Create Question/i }).click();
    await expect(page.getByText(/Question created/i)).toBeVisible({ timeout: 10000 });

    // Modal should close after successful creation
    await expect(page.getByRole('heading', { name: 'Create Question' })).not.toBeVisible({ timeout: 5000 });
  });

  test('Analytics page loads with charts and stats', async ({ page, request }) => {
    const email = uniqueEmail('an');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'AnCorp', 'HR');

    await loginViaUI(page, auth.orgId, email, password);
    await page.goto('/app/analytics');

    // Title
    await expect(page.getByRole('heading', { name: 'Analytics & Reports' })).toBeVisible({ timeout: 10000 });

    // Stat cards
    await expect(page.getByText('Total Sessions')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Completed', { exact: true })).toBeVisible();
    await expect(page.getByText('Pass Rate')).toBeVisible();
    await expect(page.getByText('Pending Decisions')).toBeVisible();

    // Charts
    await expect(page.getByRole('heading', { name: 'Hiring Funnel' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Score Distribution' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Status Breakdown' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Top Performers' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Proctoring Alerts' })).toBeVisible();

    // Export buttons
    await expect(page.getByRole('button', { name: /CSV/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Report/i })).toBeVisible();
  });

  test('Proctor Review page loads with summary and tabs', async ({ page, request }) => {
    const email = uniqueEmail('pr');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'PRCorp', 'TECHNICAL_MANAGER');

    await loginViaUI(page, auth.orgId, email, password);
    await page.goto('/app/proctor');

    // Title
    await expect(page.getByRole('heading', { name: 'Proctor Review' })).toBeVisible({ timeout: 10000 });

    // Summary stats
    await expect(page.getByText('Sessions with Alerts')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Total Events')).toBeVisible();
    await expect(page.getByText('High Severity')).toBeVisible();
    await expect(page.getByText('Clean Sessions')).toBeVisible();

    // Tabs (GlassTabs uses role="tab")
    await expect(page.getByRole('tab', { name: /All Alerts/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('tab', { name: /By Session/i })).toBeVisible();

    // Export button
    await expect(page.getByRole('button', { name: /Export/i })).toBeVisible();

    // Switch to By Session tab
    await page.getByRole('tab', { name: /By Session/i }).click();
    await page.waitForTimeout(500);
  });

  test('Settings page loads with proctoring config', async ({ page, request }) => {
    const email = uniqueEmail('set');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'SetCorp', 'HR');

    await loginViaUI(page, auth.orgId, email, password);
    await page.goto('/app/settings');

    // Title
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 10000 });

    // General section
    await expect(page.getByText('General', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Theme', { exact: true })).toBeVisible();
    await expect(page.getByText('Default Expiry Days')).toBeVisible();

    // Proctoring section
    await expect(page.getByText('Proctoring Configuration')).toBeVisible();
    await expect(page.getByText('Max Face Warnings')).toBeVisible();
    await expect(page.getByText('Max Tab Warnings')).toBeVisible();

    // Toggle options
    await expect(page.getByText('Screen Recording', { exact: true })).toBeVisible();
    await expect(page.getByText('Copy-Paste Detection')).toBeVisible();
    await expect(page.getByText('Audio Monitoring')).toBeVisible();
    await expect(page.getByText('Browser Lockdown')).toBeVisible();

    // Current config summary
    await expect(page.getByText('Current Configuration')).toBeVisible();

    // Reset and Save buttons
    await expect(page.getByRole('button', { name: /Reset/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Save/i })).toBeVisible();
  });

  test('Settings can toggle proctoring and save', async ({ page, request }) => {
    const email = uniqueEmail('set2');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'Set2Corp', 'HR');

    await loginViaUI(page, auth.orgId, email, password);
    await page.goto('/app/settings');

    await expect(page.getByText('Screen Recording', { exact: true })).toBeVisible({ timeout: 10000 });

    // Toggle Screen Recording checkbox (checkbox is sibling of text div, both inside row)
    const screenRecRow = page.locator('div[class*="justify-between"]').filter({ hasText: 'Screen Recording' });
    await screenRecRow.locator('input[type="checkbox"]').check();

    // Save
    await page.getByRole('button', { name: /Save/i }).click();
    await expect(page.getByText(/Settings saved/i)).toBeVisible({ timeout: 5000 });
  });

  test('Sidebar navigation shows all new pages', async ({ page, request }) => {
    const email = uniqueEmail('nav');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'NavCorp', 'SUPER_ADMIN');

    await loginViaUI(page, auth.orgId, email, password);

    // Check sidebar items
    await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: 'HR Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Question Bank' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Proctor Review' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Analytics' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();

    // Navigate to each page
    await page.getByRole('link', { name: /Question Bank/i }).click();
    await expect(page).toHaveURL(/\/app\/questions/);

    await page.getByRole('link', { name: /Proctor Review/i }).click();
    await expect(page).toHaveURL(/\/app\/proctor/);

    await page.getByRole('link', { name: /Analytics/i }).click();
    await expect(page).toHaveURL(/\/app\/analytics/);

    await page.getByRole('link', { name: /Settings/i }).click();
    await expect(page).toHaveURL(/\/app\/settings/);
  });

  test('HR Dashboard export triggers CSV download', async ({ page, request }) => {
    const email = uniqueEmail('exp');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'ExpCorp', 'HR');

    // Create an applicant
    await createApplicant(request, auth.accessToken, auth.orgId, 'Export User', uniqueEmail('eu'));

    await loginViaUI(page, auth.orgId, email, password);
    await page.goto('/app/hr');

    await expect(page.getByText('Export User')).toBeVisible({ timeout: 10000 });

    // Click export and verify download
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    await page.getByRole('button', { name: /Export/i }).first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.csv');
  });

  // ─── Theme Switching Tests ───

  test('Theme: switching to light removes .dark class from html', async ({ page, request }) => {
    const email = uniqueEmail('theme1');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'ThemeCorp', 'HR');

    await loginViaUI(page, auth.orgId, email, password);
    await page.goto('/app/settings');

    // Default theme is dark — .dark class should be on <html>
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Switch to Light
    await page.getByRole('combobox', { name: /Theme/i }).selectOption('light');

    // .dark class should be removed
    await expect(page.locator('html')).not.toHaveClass(/dark/, { timeout: 5000 });
  });

  test('Theme: switching back to dark adds .dark class', async ({ page, request }) => {
    const email = uniqueEmail('theme2');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'Theme2Corp', 'HR');

    await loginViaUI(page, auth.orgId, email, password);
    await page.goto('/app/settings');

    // Switch to Light first
    await page.getByRole('combobox', { name: /Theme/i }).selectOption('light');
    await expect(page.locator('html')).not.toHaveClass(/dark/, { timeout: 5000 });

    // Switch back to Dark
    await page.getByRole('combobox', { name: /Theme/i }).selectOption('dark');
    await expect(page.locator('html')).toHaveClass(/dark/, { timeout: 5000 });
  });

  test('Theme: light mode changes background to light color', async ({ page, request }) => {
    const email = uniqueEmail('theme3');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'Theme3Corp', 'HR');

    await loginViaUI(page, auth.orgId, email, password);
    await page.goto('/app/settings');

    // Get background color in dark mode
    const darkBg = await page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement);
      return styles.getPropertyValue('--bg-canvas').trim();
    });

    // Switch to light
    await page.getByRole('combobox', { name: /Theme/i }).selectOption('light');
    await expect(page.locator('html')).not.toHaveClass(/dark/, { timeout: 5000 });

    // Get background color in light mode
    const lightBg = await page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement);
      return styles.getPropertyValue('--bg-canvas').trim();
    });

    // The CSS variable values should be different
    expect(darkBg).not.toBe(lightBg);
  });

  test('Theme: persists across page navigation', async ({ page, request }) => {
    const email = uniqueEmail('theme4');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'Theme4Corp', 'HR');

    await loginViaUI(page, auth.orgId, email, password);
    await page.goto('/app/settings');

    // Switch to Light
    await page.getByRole('combobox', { name: /Theme/i }).selectOption('light');
    await expect(page.locator('html')).not.toHaveClass(/dark/, { timeout: 5000 });

    // Navigate to dashboard
    await page.goto('/app');
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    // Navigate to HR Dashboard
    await page.goto('/app/hr');
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    // Navigate back to settings — should still be light
    await page.goto('/app/settings');
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('Theme: reset button restores dark theme', async ({ page, request }) => {
    const email = uniqueEmail('theme5');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'Theme5Corp', 'HR');

    await loginViaUI(page, auth.orgId, email, password);
    await page.goto('/app/settings');

    // Switch to Light
    await page.getByRole('combobox', { name: /Theme/i }).selectOption('light');
    await expect(page.locator('html')).not.toHaveClass(/dark/, { timeout: 5000 });

    // Click Reset
    await page.getByRole('button', { name: /Reset/i }).click();

    // Should be back to dark (default)
    await expect(page.locator('html')).toHaveClass(/dark/, { timeout: 5000 });
  });

  // ─── Proctoring Config Persistence Tests ───

  test('Proctoring config: changing max face warnings persists', async ({ page, request }) => {
    const email = uniqueEmail('pc1');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'PC1Corp', 'HR');

    await loginViaUI(page, auth.orgId, email, password);
    await page.goto('/app/settings');

    // Change max face warnings to 5
    const faceInput = page.getByLabel('Max Face Warnings');
    await faceInput.fill('5');

    // Save
    await page.getByRole('button', { name: /Save/i }).click();
    await expect(page.getByText(/Settings saved/i)).toBeVisible({ timeout: 5000 });

    // Verify the current config summary shows 5
    await expect(page.getByText('Face Warnings: 5')).toBeVisible();

    // Navigate away and back
    await page.goto('/app');
    await page.goto('/app/settings');

    // Should still be 5
    await expect(faceInput).toHaveValue('5');
  });

  test('Proctoring config: toggling screen recording updates summary', async ({ page, request }) => {
    const email = uniqueEmail('pc2');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'PC2Corp', 'HR');

    await loginViaUI(page, auth.orgId, email, password);
    await page.goto('/app/settings');

    // Initial state should be OFF
    await expect(page.getByText('Screen Recording: OFF')).toBeVisible({ timeout: 10000 });

    // Toggle screen recording on
    const screenRecRow = page.locator('div[class*="justify-between"]').filter({ hasText: 'Screen Recording' });
    await screenRecRow.locator('input[type="checkbox"]').check();

    // Summary should update to ON
    await expect(page.getByText('Screen Recording: ON')).toBeVisible({ timeout: 5000 });
  });

  test('Proctoring config: reset restores defaults', async ({ page, request }) => {
    const email = uniqueEmail('pc3');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'PC3Corp', 'HR');

    await loginViaUI(page, auth.orgId, email, password);
    await page.goto('/app/settings');

    // Change values
    await page.getByLabel('Max Face Warnings').fill('10');
    await page.getByLabel('Max Tab Warnings').fill('5');

    // Toggle screen recording on
    const screenRecRow = page.locator('div[class*="justify-between"]').filter({ hasText: 'Screen Recording' });
    await screenRecRow.locator('input[type="checkbox"]').check();

    // Verify changes
    await expect(page.getByText('Face Warnings: 10')).toBeVisible();
    await expect(page.getByText('Tab Warnings: 5')).toBeVisible();
    await expect(page.getByText('Screen Recording: ON')).toBeVisible();

    // Reset
    await page.getByRole('button', { name: /Reset/i }).click();

    // Should be back to defaults
    await expect(page.getByText('Face Warnings: 3')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Tab Warnings: 2')).toBeVisible();
    await expect(page.getByText('Screen Recording: OFF')).toBeVisible();
  });
});
