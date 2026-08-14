import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { registerAndAuth, createApplicant, uniqueEmail } from '../helpers/api';

const IDENTITY_BASE = 'http://localhost:8081';
const ASSESSMENT_BASE = 'http://localhost:8082';
const EXECUTION_BASE = 'http://localhost:8083';
const PROCTORING_BASE = 'http://localhost:8084';
const REPORTING_BASE = 'http://localhost:8086';
const NOTIFICATION_BASE = 'http://localhost:8087';

async function loginViaUI(page: Page, orgId: string, email: string, password: string) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.fillOrgId(orgId);
  await loginPage.fillEmail(email);
  await loginPage.fillPassword(password);
  await loginPage.submit();
  await loginPage.expectNavigatedToDashboard();
}

test.describe('Cross-Service Integration Tests', () => {
  test('identity → assessment → execution → reporting full workflow', async ({ request, page }) => {
    // 1. Register org + user via identity-service
    const email = uniqueEmail('integration');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'IntegrationCorp', 'HR');
    expect(auth.accessToken).toBeTruthy();
    expect(auth.orgId).toBeTruthy();

    // 2. Create applicant via assessment-service
    const applicant = await createApplicant(
      request, auth.accessToken, auth.orgId,
      'Integration Candidate', uniqueEmail('candidate')
    );
    expect(applicant.id).toBeTruthy();

    // 3. Create question via assessment-service
    const questionRes = await request.post(`${ASSESSMENT_BASE}/api/v1/assessment/questions`, {
      data: {
        type: 'CODING',
        body: 'Write a function to add two numbers',
        difficulty: 'easy',
        tags: 'math',
        testCases: '1 2|3',
        hiddenTestCases: '10 20|30',
      },
      headers: {
        'Authorization': `Bearer ${auth.accessToken}`,
        'X-Org-Id': auth.orgId,
        'X-User-Id': auth.userId,
        'Content-Type': 'application/json',
      },
    });
    expect(questionRes.ok()).toBeTruthy();
    const question = await questionRes.json();
    expect(question.id).toBeTruthy();

    // 4. Execute code via execution-service
    const execRes = await request.post(`${EXECUTION_BASE}/api/v1/execution/run/sync`, {
      data: {
        language: 'python',
        code: 'print(42)',
        stdin: '',
        expectedOutput: '42',
      },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(execRes.ok()).toBeTruthy();
    const execResult = await execRes.json();
    expect(execResult.status).toBe('completed');
    expect(execResult.stdout.trim()).toBe('42');

    // 5. Check reporting-service returns analytics
    const analyticsRes = await request.get(`${REPORTING_BASE}/api/v1/reporting/orgs/${auth.orgId}/analytics`);
    expect(analyticsRes.ok()).toBeTruthy();
    const analytics = await analyticsRes.json();
    expect(analytics.orgId).toBe(auth.orgId);

    // 6. Verify notification-service is reachable
    const webhookListRes = await request.get(`${NOTIFICATION_BASE}/api/v1/notifications/webhooks`, {
      headers: { 'X-Org-Id': auth.orgId },
    });
    expect(webhookListRes.ok()).toBeTruthy();
  });

  test('assessment bulk import and export workflow', async ({ request }) => {
    const email = uniqueEmail('bulk');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'BulkCorp', 'HR');

    // Bulk import 5 questions
    const questions = Array.from({ length: 5 }, (_, i) => ({
      type: 'MCQ',
      body: `Bulk Question ${i + 1}`,
      optionA: 'A',
      optionB: 'B',
      optionC: 'C',
      optionD: 'D',
      correctOption: 'A',
      difficulty: 'easy',
      tags: 'bulk',
    }));

    const importRes = await request.post(`${ASSESSMENT_BASE}/api/v1/assessment/questions/bulk-import`, {
      data: questions,
      headers: {
        'Authorization': `Bearer ${auth.accessToken}`,
        'X-Org-Id': auth.orgId,
        'X-User-Id': auth.userId,
        'Content-Type': 'application/json',
      },
    });
    expect(importRes.ok()).toBeTruthy();
    const imported = await importRes.json();
    expect(imported.length).toBe(5);

    // Export questions as CSV
    const exportRes = await request.get(`${ASSESSMENT_BASE}/api/v1/assessment/questions/export`, {
      headers: {
        'Authorization': `Bearer ${auth.accessToken}`,
        'X-Org-Id': auth.orgId,
      },
    });
    expect(exportRes.ok()).toBeTruthy();
    const csv = await exportRes.text();
    expect(csv).toContain('Bulk Question');
  });

  test('proctoring risk score and alert evaluation', async ({ request }) => {
    const email = uniqueEmail('proctor');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'ProctorCorp', 'HR');
    const sessionId = crypto.randomUUID();

    // Get alert thresholds
    const thresholdsRes = await request.get(`${PROCTORING_BASE}/api/v1/proctoring/alert-thresholds`);
    expect(thresholdsRes.ok()).toBeTruthy();
    const thresholds = await thresholdsRes.json();
    expect(thresholds.warning).toBeDefined();
    expect(thresholds.critical).toBeDefined();
    expect(thresholds.termination).toBeDefined();

    // Get alert evaluation for empty session
    const alertRes = await request.get(`${PROCTORING_BASE}/api/v1/proctoring/sessions/${sessionId}/alert`);
    expect(alertRes.ok()).toBeTruthy();
    const alert = await alertRes.json();
    expect(alert.level).toBeDefined();
    expect(alert.currentScore).toBeDefined();

    // Get events for session (should be empty)
    const eventsRes = await request.get(`${PROCTORING_BASE}/api/v1/proctoring/sessions/${sessionId}/events`);
    expect(eventsRes.ok()).toBeTruthy();
    const events = await eventsRes.json();
    expect(Array.isArray(events)).toBeTruthy();
  });

  test('reporting export endpoints return correct content types', async ({ request }) => {
    const email = uniqueEmail('report');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'ReportCorp', 'HR');

    // CSV export
    const csvRes = await request.get(`${REPORTING_BASE}/api/v1/reporting/orgs/${auth.orgId}/analytics/export?format=csv`);
    expect(csvRes.ok()).toBeTruthy();
    expect(csvRes.headers()['content-type']).toContain('text/csv');

    // PDF export
    const pdfRes = await request.get(`${REPORTING_BASE}/api/v1/reporting/orgs/${auth.orgId}/analytics/export?format=pdf`);
    expect(pdfRes.ok()).toBeTruthy();
    expect(pdfRes.headers()['content-type']).toContain('application/pdf');

    // Cheating insights
    const cheatingRes = await request.get(`${REPORTING_BASE}/api/v1/reporting/orgs/${auth.orgId}/cheating-insights`);
    expect(cheatingRes.ok()).toBeTruthy();
  });

  test('notification webhook registration and listing', async ({ request }) => {
    const email = uniqueEmail('webhook');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'WebhookCorp', 'HR');

    // Register a webhook
    const registerRes = await request.post(`${NOTIFICATION_BASE}/api/v1/notifications/webhooks`, {
      data: {
        url: 'https://example.com/webhook',
        eventTypes: ['assessment.started', 'assessment.completed'],
        secret: 'test-secret',
      },
      headers: {
        'X-Org-Id': auth.orgId,
        'Content-Type': 'application/json',
      },
    });
    expect(registerRes.ok()).toBeTruthy();
    const webhook = await registerRes.json();
    expect(webhook.url).toBe('https://example.com/webhook');
    expect(webhook.active).toBe(true);

    // List webhooks
    const listRes = await request.get(`${NOTIFICATION_BASE}/api/v1/notifications/webhooks`, {
      headers: { 'X-Org-Id': auth.orgId },
    });
    expect(listRes.ok()).toBeTruthy();
    const webhooks = await listRes.json();
    expect(webhooks.length).toBeGreaterThanOrEqual(1);
  });

  test('UI login and dashboard navigation', async ({ page, request }) => {
    const email = uniqueEmail('ui');
    const password = 'Password123!';
    const auth = await registerAndAuth(request, email, password, 'UICorp', 'HR');

    await loginViaUI(page, auth.orgId, email, password);
    await page.goto('/app');

    // Verify dashboard loads
    await expect(page.getByText('Total Applicants')).toBeVisible({ timeout: 10000 });
  });
});
