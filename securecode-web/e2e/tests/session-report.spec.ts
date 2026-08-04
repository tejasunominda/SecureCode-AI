import { test, expect, request } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { HRDashboardPage } from '../pages/HRDashboardPage';
import {
  registerAndAuth, createApplicant, shortlistApplicant, generateLink,
  startTest, createQuestion, publishQuestion, submitAnswer, submitCode,
  submitTest, getSessionReport, listSessions, makeHiringDecision,
  uniqueEmail,
} from '../helpers/api';

const DEFAULT_TEMPLATE_ID = 'a0000000-0000-0000-0000-000000000001';

async function setupCompletedSession(apiRequest: import('@playwright/test').APIRequestContext) {
  const email = uniqueEmail('tm');
  const password = 'Password123!';
  const auth = await registerAndAuth(apiRequest, email, password, 'TestCorp Report', 'TECHNICAL_MANAGER');

  // Create + publish questions
  const aptQ = await createQuestion(apiRequest, auth.accessToken, auth.orgId, auth.userId, {
    type: 'aptitude', body: 'What is 5 + 3?',
    optionA: '7', optionB: '8', optionC: '9', optionD: '10',
    correctOption: 'B', difficulty: 'easy',
  });
  await publishQuestion(apiRequest, auth.accessToken, aptQ.id);

  const reasonQ = await createQuestion(apiRequest, auth.accessToken, auth.orgId, auth.userId, {
    type: 'reasoning', body: 'Complete the sequence: 2, 4, 8, ?',
    optionA: '12', optionB: '14', optionC: '16', optionD: '18',
    correctOption: 'C', difficulty: 'medium',
  });
  await publishQuestion(apiRequest, auth.accessToken, reasonQ.id);

  const codingQ = await createQuestion(apiRequest, auth.accessToken, auth.orgId, auth.userId, {
    type: 'coding', body: 'Write a function to reverse a string.',
    testCases: 'Input: "hello" => Output: "olleh"', difficulty: 'easy',
  });
  await publishQuestion(apiRequest, auth.accessToken, codingQ.id);

  // Create applicant, shortlist, generate link
  const applicant = await createApplicant(
    apiRequest, auth.accessToken, auth.orgId,
    'Report User', uniqueEmail('report')
  );
  await shortlistApplicant(apiRequest, auth.accessToken, applicant.id);
  const link = await generateLink(
    apiRequest, auth.accessToken, auth.orgId, auth.userId,
    applicant.id, DEFAULT_TEMPLATE_ID, 5
  );

  // Start test
  const startResult = await startTest(apiRequest, link.token);
  const sessionId = startResult.body.id;

  // Submit answers
  await submitAnswer(apiRequest, auth.accessToken, sessionId, aptQ.id, 'B');
  await submitAnswer(apiRequest, auth.accessToken, sessionId, reasonQ.id, 'C');
  await submitCode(apiRequest, auth.accessToken, sessionId, codingQ.id, 'python', 'def reverse(s): return s[::-1]');
  await submitTest(apiRequest, auth.accessToken, sessionId);

  return { auth, sessionId, applicant, aptQ, reasonQ, codingQ };
}

test.describe('Feature 4: Session Report + Hiring Decision', () => {
  test('Technical Manager views session report and makes hiring decision via API', async ({ request: apiRequest }) => {
    const { auth, sessionId } = await setupCompletedSession(apiRequest);

    // Get session report
    const report = await getSessionReport(apiRequest, auth.accessToken, sessionId);
    expect(report.sessionId).toBe(sessionId);
    expect(report.status).toBe('submitted');
    expect(report.aptitudeCorrect).toBe(1);
    expect(report.aptitudeTotal).toBe(1);
    expect(report.reasoningCorrect).toBe(1);
    expect(report.reasoningTotal).toBe(1);
    expect(report.codingResults.length).toBe(1);
    expect(report.codingResults[0].language).toBe('python');
    expect(report.hiringDecision).toBeNull();

    // Make hiring decision
    const decision = await makeHiringDecision(
      apiRequest, auth.accessToken, sessionId, auth.userId, 'pass', 'Strong problem-solving skills'
    );
    expect(decision).toBeTruthy();

    // Verify decision in report
    const updatedReport = await getSessionReport(apiRequest, auth.accessToken, sessionId);
    expect(updatedReport.hiringDecision).toBe('pass');
    expect(updatedReport.technicalManagerNotes).toBe('Strong problem-solving skills');
  });

  test('HR views sessions tab and sees completed session via UI', async ({ page, request: apiRequest }) => {
    const { auth, sessionId, applicant } = await setupCompletedSession(apiRequest);

    // Login as TM via UI
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.fillOrgId(auth.orgId);
    await loginPage.fillEmail(auth.email);
    await loginPage.fillPassword('Password123!');
    await loginPage.submit();
    await loginPage.expectNavigatedToDashboard();

    // Navigate to HR dashboard and click Sessions tab
    const hrPage = new HRDashboardPage(page);
    await hrPage.goto();
    await hrPage.clickSessionsTab();

    // Verify the applicant name appears in sessions table
    await expect(page.locator('tr', { hasText: 'Report User' })).toBeVisible({ timeout: 10000 });
  });

  test('Hiring decision "reject" works via API', async ({ request: apiRequest }) => {
    const { auth, sessionId } = await setupCompletedSession(apiRequest);

    const decision = await makeHiringDecision(
      apiRequest, auth.accessToken, sessionId, auth.userId, 'reject', 'Insufficient coding skills'
    );
    expect(decision).toBeTruthy();

    const report = await getSessionReport(apiRequest, auth.accessToken, sessionId);
    expect(report.hiringDecision).toBe('reject');
  });

  test('List sessions returns all org sessions via API', async ({ request: apiRequest }) => {
    const { auth, sessionId } = await setupCompletedSession(apiRequest);

    const sessions = await listSessions(apiRequest, auth.accessToken, auth.orgId);
    expect(Array.isArray(sessions)).toBe(true);
    const found = sessions.find((s: any) => s.sessionId === sessionId);
    expect(found).toBeTruthy();
    expect(found.applicantName).toBe('Report User');
    expect(found.status).toBe('submitted');
  });
});
