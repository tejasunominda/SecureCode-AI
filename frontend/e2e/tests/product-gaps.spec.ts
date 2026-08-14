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

test.describe('Product Gap Fixes — E2E Tests', () => {

  // ─── Token Refresh ───

  test('Token refresh: app still works after token is corrupted', async ({ page, request }) => {
    const email = uniqueEmail('tr1');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'TokenCorp', 'HR');

    await loginViaUI(page, auth.orgId, email, password);

    // Corrupt the access token
    await page.evaluate(() => {
      localStorage.setItem('securecode_access_token', 'invalid-corrupted-token');
    });

    // Navigate to HR dashboard — should trigger 401, refresh, and retry
    await page.goto('/app/hr');
    // The page should still load (token refresh happened) — look for the applicants tab
    await expect(page.getByText(/Applicants/i).first()).toBeVisible({ timeout: 15000 });
  });

  // ─── Role-Based Access Control ───

  test('RBAC: HR role sees HR Dashboard and Settings in sidebar', async ({ page, request }) => {
    const email = uniqueEmail('rbac1');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'RBAC1Corp', 'HR');

    await loginViaUI(page, auth.orgId, email, password);

    // HR should see HR Dashboard
    await expect(page.getByRole('link', { name: 'HR Dashboard' })).toBeVisible();
    // HR should see Settings
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
    // HR should NOT see Proctor Review
    await expect(page.getByRole('link', { name: 'Proctor Review' })).not.toBeVisible();
  });

  test('RBAC: TECHNICAL_MANAGER sees Proctor Review but not Settings', async ({ page, request }) => {
    const email = uniqueEmail('rbac2');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'RBAC2Corp', 'TECHNICAL_MANAGER');

    await loginViaUI(page, auth.orgId, email, password);

    // TM should see Proctor Review
    await expect(page.getByRole('link', { name: 'Proctor Review' })).toBeVisible();
    // TM should NOT see Settings
    await expect(page.getByRole('link', { name: 'Settings' })).not.toBeVisible();
    // TM should NOT see HR Dashboard
    await expect(page.getByRole('link', { name: 'HR Dashboard' })).not.toBeVisible();
  });

  test('RBAC: HR accessing Proctor Review redirects to dashboard', async ({ page, request }) => {
    const email = uniqueEmail('rbac3');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'RBAC3Corp', 'HR');

    await loginViaUI(page, auth.orgId, email, password);

    // Try to navigate to Proctor Review directly
    await page.goto('/app/proctor');

    // Should be redirected to /app (not /app/proctor)
    await page.waitForURL('**/app', { timeout: 10000 });
    await expect(page).toHaveURL(/.*\/app$/);
  });

  // ─── Forgot Password ───

  test('Forgot password: modal opens and can be cancelled', async ({ page }) => {
    await page.goto('/login');

    // Click "Forgot password?"
    await page.getByText('Forgot password?').click();

    // Modal should appear
    await expect(page.getByText('Reset Password')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Enter your organization ID and email')).toBeVisible();

    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Reset Password')).not.toBeVisible({ timeout: 5000 });
  });

  test('Forgot password: form fields are present and fillable', async ({ page }) => {
    await page.goto('/login');

    await page.getByText('Forgot password?').click();
    await expect(page.getByText('Reset Password')).toBeVisible({ timeout: 5000 });

    // Fill the form fields by name attribute
    const orgInput = page.locator('input[name="forgotOrgId"]');
    const emailInput = page.locator('input[name="forgotEmail"]');
    await orgInput.fill('test-org-id');
    await emailInput.fill('test@example.com');

    await expect(orgInput).toHaveValue('test-org-id');
    await expect(emailInput).toHaveValue('test@example.com');

    // Close modal
    await page.keyboard.press('Escape');
  });

  // ─── Resume Upload ───

  test('Resume upload: file input is present in Add Applicant modal', async ({ page, request }) => {
    const email = uniqueEmail('ru1');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'RUCorp', 'HR');

    await loginViaUI(page, auth.orgId, email, password);
    await page.goto('/app/hr');

    // Wait for page to load
    await expect(page.getByText(/Applicants/i).first()).toBeVisible({ timeout: 10000 });

    // Open Add Applicant modal
    await page.getByRole('button', { name: /Add Applicant/i }).click();
    await expect(page.getByText('Resume (optional)')).toBeVisible({ timeout: 10000 });

    // Should see file upload label
    await expect(page.locator('label[for="resume-upload"]')).toBeVisible();
    await expect(page.getByText('Choose file...')).toBeVisible();
  });

  test('Resume upload: can add applicant with resume URL', async ({ page, request }) => {
    const email = uniqueEmail('ru2');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'RU2Corp', 'HR');

    await loginViaUI(page, auth.orgId, email, password);
    await page.goto('/app/hr');

    // Wait for page to load
    await expect(page.getByText(/Applicants/i).first()).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Add Applicant/i }).click();
    await expect(page.getByText('Resume (optional)')).toBeVisible({ timeout: 10000 });

    // Fill name and email using placeholder-based locators
    await page.getByPlaceholder('Jane Doe').fill('Resume Test User');
    await page.getByPlaceholder('jane@example.com').fill(uniqueEmail('ru2-user'));
    await page.getByPlaceholder('https://...').fill('https://example.com/resume.pdf');

    // Click the Add Applicant button inside the modal (not the one that opens the modal)
    await page.getByRole('button', { name: 'Add Applicant' }).last().click();

    // Should see success toast
    await expect(page.getByText(/Applicant added/i)).toBeVisible({ timeout: 15000 });
  });

  // ─── Proctoring Evidence Viewer ───

  test('Proctor review: page loads for TECHNICAL_MANAGER', async ({ page, request }) => {
    const email = uniqueEmail('pv1');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'PVCorp', 'TECHNICAL_MANAGER');

    await createApplicant(request, auth.accessToken, auth.orgId, 'Proctor View User', uniqueEmail('pv1-user'));

    await loginViaUI(page, auth.orgId, email, password);
    await page.goto('/app/proctor');

    // Should see the proctor review page heading
    await expect(page.getByRole('heading', { name: 'Proctor Review' })).toBeVisible({ timeout: 10000 });
  });

  // ─── Candidate Results Page ───

  test('Candidate results: page loads with fallback message for unknown session', async ({ page, request }) => {
    const email = uniqueEmail('cr1');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'CRCorp', 'HR');

    await loginViaUI(page, auth.orgId, email, password);

    // Navigate to a results page with a fake session ID
    await page.goto('/test/fake-session-id/complete');

    // Should show the fallback "Test Submitted" message
    await expect(page.getByText(/Test Submitted/i)).toBeVisible({ timeout: 10000 });
  });

  // ─── Question CSV Import ───

  test('Question import: file upload input is present', async ({ page, request }) => {
    const email = uniqueEmail('qi1');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'QICorp', 'HR');

    await loginViaUI(page, auth.orgId, email, password);
    await page.goto('/app/questions');

    // Wait for page to load — use main region to avoid sidebar link match
    await expect(page.getByRole('main').getByText('Question Bank')).toBeVisible({ timeout: 10000 });

    // Open import modal
    await page.getByRole('button', { name: /Import/i }).click();
    await expect(page.getByText('Import Questions from CSV')).toBeVisible({ timeout: 5000 });

    // Should see file upload input
    await expect(page.getByText('Upload CSV File')).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeAttached();

    // Should also see the paste textarea
    await expect(page.getByText('or paste CSV below')).toBeVisible();
  });

  test('Question import: CSV text area still works', async ({ page, request }) => {
    const email = uniqueEmail('qi2');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'QI2Corp', 'HR');

    await loginViaUI(page, auth.orgId, email, password);
    await page.goto('/app/questions');

    // Wait for page to load
    await expect(page.getByRole('main').getByText('Question Bank')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Import/i }).click();
    await expect(page.getByText('Import Questions from CSV')).toBeVisible({ timeout: 5000 });

    // Type CSV content directly into the textarea
    const textarea = page.locator('textarea').last();
    await textarea.fill('type,body,difficulty,tags\naptitude,What is 5+5?,easy,math');

    // The import button inside the modal should be enabled
    await expect(page.getByLabel('Import Questions from CSV').getByRole('button', { name: 'Import' })).toBeEnabled();
  });

  // ─── Sidebar Navigation for Different Roles ───

  test('RBAC: Dashboard link is always visible regardless of role', async ({ page, request }) => {
    const email = uniqueEmail('rbac4');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'RBAC4Corp', 'TECHNICAL_MANAGER');

    await loginViaUI(page, auth.orgId, email, password);

    // Dashboard should always be visible
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  });

  test('RBAC: Analytics is visible to all roles', async ({ page, request }) => {
    const email = uniqueEmail('rbac5');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'RBAC5Corp', 'TECHNICAL_MANAGER');

    await loginViaUI(page, auth.orgId, email, password);

    await expect(page.getByRole('link', { name: 'Analytics' })).toBeVisible();
  });
});
