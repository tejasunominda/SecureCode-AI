import { test, expect, request } from '@playwright/test';
import { RegisterPage } from '../pages/RegisterPage';
import { LoginPage } from '../pages/LoginPage';
import { HRDashboardPage } from '../pages/HRDashboardPage';
import { registerAndAuth, createApplicant, listApplicants, uniqueEmail } from '../helpers/api';

test.describe('Feature 1: Applicant Intake — Resume Upload + Applicant Record Creation', () => {
  test('HR registers, logs in, and creates an applicant via UI', async ({ page }) => {
    const email = uniqueEmail('hr');
    const password = 'Password123!';
    const orgName = 'TestCorp E2E';

    // Step 1: Register via UI
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.fillOrgName(orgName);
    await registerPage.fillEmail(email);
    await registerPage.fillPassword(password);
    await registerPage.selectRole('HR');
    await registerPage.submit();

    // Should navigate to /app
    await registerPage.expectNavigatedToDashboard();

    // Step 2: Navigate to HR Dashboard
    const hrPage = new HRDashboardPage(page);
    await hrPage.goto();

    // Step 3: Add an applicant via UI
    const applicantName = 'Jane Doe';
    const applicantEmail = uniqueEmail('jane');
    await hrPage.clickAddApplicant();
    await hrPage.fillApplicantForm(applicantName, applicantEmail, 'https://example.com/resume.pdf');
    await hrPage.submitApplicantForm();

    // Step 4: Verify applicant appears in table
    await hrPage.expectApplicantInTable(applicantName);
    await hrPage.expectApplicantStatus(applicantName, 'applied');
  });

  test('HR logs in with existing credentials and sees applicants', async ({ page, request: apiRequest }) => {
    // First register via API to get credentials
    const email = uniqueEmail('hr2');
    const password = 'Password123!';
    const auth = await registerAndAuth(apiRequest, email, password, 'TestCorp Login', 'HR');

    // Create an applicant via API
    const applicant = await createApplicant(
      apiRequest, auth.accessToken, auth.orgId,
      'John Smith', uniqueEmail('john')
    );

    // Now log in via UI
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.fillOrgId(auth.orgId);
    await loginPage.fillEmail(email);
    await loginPage.fillPassword(password);
    await loginPage.submit();

    await loginPage.expectNavigatedToDashboard();

    // Navigate to HR dashboard and verify applicant
    const hrPage = new HRDashboardPage(page);
    await hrPage.goto();
    await hrPage.expectApplicantInTable('John Smith');
  });

  test('HR shortlists an applicant via UI', async ({ page, request: apiRequest }) => {
    // Setup: register + create applicant via API
    const email = uniqueEmail('hr3');
    const password = 'Password123!';
    const auth = await registerAndAuth(apiRequest, email, password, 'TestCorp Shortlist', 'HR');

    const applicant = await createApplicant(
      apiRequest, auth.accessToken, auth.orgId,
      'Alice Wang', uniqueEmail('alice')
    );

    // Login via UI
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.fillOrgId(auth.orgId);
    await loginPage.fillEmail(email);
    await loginPage.fillPassword(password);
    await loginPage.submit();
    await loginPage.expectNavigatedToDashboard();

    // Go to HR dashboard, shortlist Alice
    const hrPage = new HRDashboardPage(page);
    await hrPage.goto();
    await hrPage.expectApplicantInTable('Alice Wang');
    await hrPage.shortlistApplicant('Alice Wang');

    // Verify status changed to shortlisted
    await hrPage.expectApplicantStatus('Alice Wang', 'shortlisted');
  });

  test('HR rejects an applicant via UI', async ({ page, request: apiRequest }) => {
    const email = uniqueEmail('hr4');
    const password = 'Password123!';
    const auth = await registerAndAuth(apiRequest, email, password, 'TestCorp Reject', 'HR');

    const applicant = await createApplicant(
      apiRequest, auth.accessToken, auth.orgId,
      'Bob Chen', uniqueEmail('bob')
    );

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.fillOrgId(auth.orgId);
    await loginPage.fillEmail(email);
    await loginPage.fillPassword(password);
    await loginPage.submit();
    await loginPage.expectNavigatedToDashboard();

    const hrPage = new HRDashboardPage(page);
    await hrPage.goto();
    await hrPage.expectApplicantInTable('Bob Chen');
    await hrPage.rejectApplicant('Bob Chen');

    await hrPage.expectApplicantStatus('Bob Chen', 'rejected');
  });

  test('Backend API verification — applicant created in DB', async ({ request: apiRequest }) => {
    const email = uniqueEmail('hr5');
    const password = 'Password123!';
    const auth = await registerAndAuth(apiRequest, email, password, 'TestCorp API', 'HR');

    // Create applicant via API
    const applicant = await createApplicant(
      apiRequest, auth.accessToken, auth.orgId,
      'API Test User', uniqueEmail('apitest')
    );

    expect(applicant.id).toBeTruthy();
    expect(applicant.name).toBe('API Test User');
    expect(applicant.status).toBe('applied');

    // List applicants and verify
    const applicants = await listApplicants(apiRequest, auth.accessToken, auth.orgId);
    const found = applicants.find((a: any) => a.id === applicant.id);
    expect(found).toBeTruthy();
    expect(found.name).toBe('API Test User');
  });
});
