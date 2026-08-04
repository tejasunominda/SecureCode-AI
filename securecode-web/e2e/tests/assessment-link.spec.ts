import { test, expect, request } from '@playwright/test';
import { RegisterPage } from '../pages/RegisterPage';
import { LoginPage } from '../pages/LoginPage';
import { HRDashboardPage } from '../pages/HRDashboardPage';
import { CandidateInstructionsPage } from '../pages/CandidateInstructionsPage';
import { registerAndAuth, createApplicant, shortlistApplicant, generateLink, startTest, uniqueEmail } from '../helpers/api';

const DEFAULT_TEMPLATE_ID = 'a0000000-0000-0000-0000-000000000001';

test.describe('Feature 2: Assessment Link Generation + Candidate Test Start', () => {
  test('HR shortlists applicant, generates link via UI, candidate starts test via UI', async ({ page, request: apiRequest }) => {
    // Setup: register + create + shortlist applicant via API
    const email = uniqueEmail('hr');
    const password = 'Password123!';
    const auth = await registerAndAuth(apiRequest, email, password, 'TestCorp Link', 'HR');

    const applicant = await createApplicant(
      apiRequest, auth.accessToken, auth.orgId,
      'Link Test User', uniqueEmail('linktest')
    );
    await shortlistApplicant(apiRequest, auth.accessToken, applicant.id);

    // Login via UI
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.fillOrgId(auth.orgId);
    await loginPage.fillEmail(email);
    await loginPage.fillPassword(password);
    await loginPage.submit();
    await loginPage.expectNavigatedToDashboard();

    // Go to HR dashboard, send test to shortlisted applicant
    const hrPage = new HRDashboardPage(page);
    await hrPage.goto();
    await hrPage.expectApplicantInTable('Link Test User');
    await hrPage.expectApplicantStatus('Link Test User', 'shortlisted');
    await hrPage.sendTestToApplicant('Link Test User');

    // Fill template ID and generate link
    await hrPage.fillTemplateId(DEFAULT_TEMPLATE_ID);
    await hrPage.clickGenerateLink();

    // Generate a link via API for the candidate to use (clipboard may not work in headless)
    const link = await generateLink(
      apiRequest, auth.accessToken, auth.orgId, auth.userId,
      applicant.id, DEFAULT_TEMPLATE_ID, 5
    );

    // Candidate opens the test link
    const candidatePage = new CandidateInstructionsPage(page);
    await candidatePage.goto(link.token);
    await candidatePage.expectTitle();

    // Check consent and start test
    await candidatePage.checkConsent();
    await candidatePage.clickStart();

    // Should navigate to the test page
    await candidatePage.expectNavigatedToTest();
  });

  test('Candidate sees error for invalid token', async ({ page }) => {
    const candidatePage = new CandidateInstructionsPage(page);
    await candidatePage.goto('invalid-token-12345');
    await candidatePage.checkConsent();
    await candidatePage.clickStart();
    await candidatePage.expectError();
  });

  test('Backend API: generate link and start test via API', async ({ request: apiRequest }) => {
    const email = uniqueEmail('hr');
    const password = 'Password123!';
    const auth = await registerAndAuth(apiRequest, email, password, 'TestCorp API Link', 'HR');

    const applicant = await createApplicant(
      apiRequest, auth.accessToken, auth.orgId,
      'API Link User', uniqueEmail('apilink')
    );
    await shortlistApplicant(apiRequest, auth.accessToken, applicant.id);

    const link = await generateLink(
      apiRequest, auth.accessToken, auth.orgId, auth.userId,
      applicant.id, DEFAULT_TEMPLATE_ID, 5
    );

    expect(link.token).toBeTruthy();
    expect(link.testUrl).toContain('/test/');
    expect(link.status).toBe('pending');

    // Start the test via API
    const result = await startTest(apiRequest, link.token);
    expect(result.ok).toBe(true);
    expect(result.body.id).toBeTruthy();
    expect(result.body.status).toBe('in_progress');
    expect(result.body.currentSection).toBe('aptitude');
  });

  test('Cannot start test with already-used link', async ({ request: apiRequest }) => {
    const email = uniqueEmail('hr');
    const password = 'Password123!';
    const auth = await registerAndAuth(apiRequest, email, password, 'TestCorp Reuse', 'HR');

    const applicant = await createApplicant(
      apiRequest, auth.accessToken, auth.orgId,
      'Reuse Test User', uniqueEmail('reuse')
    );
    await shortlistApplicant(apiRequest, auth.accessToken, applicant.id);

    const link = await generateLink(
      apiRequest, auth.accessToken, auth.orgId, auth.userId,
      applicant.id, DEFAULT_TEMPLATE_ID, 5
    );

    // Start test first time - should succeed
    const result1 = await startTest(apiRequest, link.token);
    expect(result1.ok).toBe(true);

    // Try to start again - should fail
    const result2 = await startTest(apiRequest, link.token);
    expect(result2.ok).toBe(false);
  });
});
