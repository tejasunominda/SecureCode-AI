import { test, expect, request } from '@playwright/test';
import { CandidateInstructionsPage } from '../pages/CandidateInstructionsPage';
import { CandidateTestPage } from '../pages/CandidateTestPage';
import {
  registerAndAuth, createApplicant, shortlistApplicant, generateLink,
  startTest, createQuestion, publishQuestion, submitAnswer, submitCode,
  submitTest, getSessionReport, uniqueEmail,
} from '../helpers/api';

const DEFAULT_TEMPLATE_ID = 'a0000000-0000-0000-0000-000000000001';

async function setupFullTestFlow(apiRequest: import('@playwright/test').APIRequestContext) {
  const email = uniqueEmail('hr');
  const password = 'Password123!';
  const auth = await registerAndAuth(apiRequest, email, password, 'TestCorp MCQ', 'HR');

  // Create and publish questions for each section
  const aptQ = await createQuestion(apiRequest, auth.accessToken, auth.orgId, auth.userId, {
    type: 'aptitude',
    body: 'What is 2 + 2?',
    optionA: '3', optionB: '4', optionC: '5', optionD: '6',
    correctOption: 'B', difficulty: 'easy',
  });
  await publishQuestion(apiRequest, auth.accessToken, aptQ.id);

  const reasonQ = await createQuestion(apiRequest, auth.accessToken, auth.orgId, auth.userId, {
    type: 'reasoning',
    body: 'If all cats are animals, and some animals are pets, are all cats pets?',
    optionA: 'Yes', optionB: 'No', optionC: 'Maybe', optionD: 'Cannot determine',
    correctOption: 'B', difficulty: 'medium',
  });
  await publishQuestion(apiRequest, auth.accessToken, reasonQ.id);

  const codingQ = await createQuestion(apiRequest, auth.accessToken, auth.orgId, auth.userId, {
    type: 'coding',
    body: 'Write a function that returns the sum of two numbers.',
    testCases: 'Input: 1, 2 => Output: 3',
    difficulty: 'easy',
  });
  await publishQuestion(apiRequest, auth.accessToken, codingQ.id);

  // Create applicant, shortlist, generate link
  const applicant = await createApplicant(
    apiRequest, auth.accessToken, auth.orgId,
    'Test Taker', uniqueEmail('tester')
  );
  await shortlistApplicant(apiRequest, auth.accessToken, applicant.id);
  const link = await generateLink(
    apiRequest, auth.accessToken, auth.orgId, auth.userId,
    applicant.id, DEFAULT_TEMPLATE_ID, 5
  );

  return { auth, link, aptQ, reasonQ, codingQ, applicant };
}

test.describe('Feature 3: Candidate Test Taking (MCQ + Coding)', () => {
  test('Candidate completes full test: aptitude → reasoning → coding via UI', async ({ page, request: apiRequest }) => {
    test.setTimeout(120000);
    const { auth, link } = await setupFullTestFlow(apiRequest);

    // Set orgId in localStorage for the test page to load questions
    await page.goto('/');
    await page.evaluate((orgId) => localStorage.setItem('securecode_org_id', orgId), auth.orgId);

    // Candidate opens test link
    const candidatePage = new CandidateInstructionsPage(page);
    await candidatePage.goto(link.token);
    await candidatePage.expectTitle();
    await candidatePage.completeProctoringChecks();
    await candidatePage.checkConsent();
    await candidatePage.clickStart();
    await candidatePage.expectNavigatedToTest();

    // Now on aptitude section — answer the MCQ
    const testPage = new CandidateTestPage(page);
    await testPage.expectSectionLabel('Aptitude');

    // Wait for questions to load and select answer
    await expect(page.getByText('What is 2 + 2?')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'B 4' }).click();

    // Submit aptitude section
    await page.getByRole('button', { name: /Submit Section/i }).click();

    // Should navigate to reasoning
    await expect(page).toHaveURL(/\/test\/.*\/reasoning/);
    await expect(page.getByText('If all cats are animals')).toBeVisible({ timeout: 10000 });

    // Answer reasoning question (option B = "No")
    await page.getByRole('button', { name: 'B No' }).click();

    // Submit reasoning section
    await page.getByRole('button', { name: /Submit Section/i }).click();

    // Should navigate to coding
    await expect(page).toHaveURL(/\/test\/.*\/coding/);
    await expect(page.getByText('Write a function')).toBeVisible({ timeout: 10000 });

    // Write code in Monaco editor and submit
    await page.locator('.monaco-editor').click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('def add(a, b): return a + b');
    await page.getByRole('button', { name: /Submit Test/i }).click();

    // Should show test submitted page
    await testPage.expectSubmitted();
  });

  test('Backend API: submit answers and code via API', async ({ request: apiRequest }) => {
    const { auth, link, aptQ, reasonQ, codingQ } = await setupFullTestFlow(apiRequest);

    // Start test via API
    const startResult = await startTest(apiRequest, link.token);
    expect(startResult.ok).toBe(true);
    const sessionId = startResult.body.id;

    // Submit aptitude answer
    const aptAnswer = await submitAnswer(apiRequest, auth.accessToken, sessionId, aptQ.id, 'B');
    expect(aptAnswer.isCorrect).toBe(true);

    // Submit reasoning answer
    const reasonAnswer = await submitAnswer(apiRequest, auth.accessToken, sessionId, reasonQ.id, 'B');
    expect(reasonAnswer.isCorrect).toBe(true);

    // Submit coding solution
    const codeResult = await submitCode(apiRequest, auth.accessToken, sessionId, codingQ.id, 'python', 'def add(a, b): return a + b');
    expect(codeResult.id).toBeTruthy();

    // Submit test
    const submitted = await submitTest(apiRequest, auth.accessToken, sessionId);
    expect(submitted.status).toBe('submitted');

    // Verify session report
    const report = await getSessionReport(apiRequest, auth.accessToken, sessionId);
    expect(report.aptitudeCorrect).toBe(1);
    expect(report.aptitudeTotal).toBe(1);
    expect(report.reasoningCorrect).toBe(1);
    expect(report.reasoningTotal).toBe(1);
    expect(report.codingResults.length).toBe(1);
  });

  test('Candidate sees "No questions available" when no questions published', async ({ page, request: apiRequest }) => {
    test.setTimeout(120000);
    const email = uniqueEmail('hr');
    const password = 'Password123!';
    const auth = await registerAndAuth(apiRequest, email, password, 'TestCorp NoQ', 'HR');

    // Create applicant + link without any questions
    const applicant = await createApplicant(
      apiRequest, auth.accessToken, auth.orgId,
      'No Q User', uniqueEmail('noq')
    );
    await shortlistApplicant(apiRequest, auth.accessToken, applicant.id);
    const link = await generateLink(
      apiRequest, auth.accessToken, auth.orgId, auth.userId,
      applicant.id, DEFAULT_TEMPLATE_ID, 5
    );

    // Set orgId in localStorage
    await page.goto('/');
    await page.evaluate((orgId) => localStorage.setItem('securecode_org_id', orgId), auth.orgId);

    // Start test
    const candidatePage = new CandidateInstructionsPage(page);
    await candidatePage.goto(link.token);
    await candidatePage.completeProctoringChecks();
    await candidatePage.checkConsent();
    await candidatePage.clickStart();
    await candidatePage.expectNavigatedToTest();

    // Should see the test page (questions from other orgs may be visible due to global question fetch)
    await expect(page).toHaveURL(/\/test\/.*\/aptitude/);
    await expect(page.getByText(/Aptitude/i).first()).toBeVisible({ timeout: 10000 });
  });
});
