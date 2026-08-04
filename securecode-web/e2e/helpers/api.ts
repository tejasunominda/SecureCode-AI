import { APIRequestContext } from '@playwright/test';

const IDENTITY_BASE = 'http://localhost:8081';
const ASSESSMENT_BASE = 'http://localhost:8082';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  userId: string;
  orgId: string;
  email: string;
  roles: string[];
}

export async function registerAndAuth(request: APIRequestContext, email: string, password: string, orgName: string, role: string): Promise<AuthResult> {
  const res = await request.post(`${IDENTITY_BASE}/api/v1/auth/register`, {
    data: { email, password, orgName, role },
  });
  if (!res.ok()) {
    throw new Error(`Register failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

export async function loginAndAuth(request: APIRequestContext, orgId: string, email: string, password: string): Promise<AuthResult> {
  const res = await request.post(`${IDENTITY_BASE}/api/v1/auth/login`, {
    data: { orgId, email, password },
  });
  if (!res.ok()) {
    throw new Error(`Login failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

export async function createApplicant(request: APIRequestContext, token: string, orgId: string, name: string, email: string, resumeUrl?: string) {
  const res = await request.post(`${ASSESSMENT_BASE}/api/v1/assessment/applicants`, {
    data: { name, email, resumeUrl: resumeUrl ?? null },
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Org-Id': orgId,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok()) {
    throw new Error(`Create applicant failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

export async function listApplicants(request: APIRequestContext, token: string, orgId: string) {
  const res = await request.get(`${ASSESSMENT_BASE}/api/v1/assessment/applicants`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Org-Id': orgId,
    },
  });
  if (!res.ok()) {
    throw new Error(`List applicants failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

export async function shortlistApplicant(request: APIRequestContext, token: string, applicantId: string) {
  const res = await request.put(`${ASSESSMENT_BASE}/api/v1/assessment/applicants/${applicantId}/shortlist`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok()) {
    throw new Error(`Shortlist failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

export async function generateLink(request: APIRequestContext, token: string, orgId: string, userId: string, applicantId: string, templateId: string, expiryDays = 5) {
  const res = await request.post(`${ASSESSMENT_BASE}/api/v1/assessment/links/generate`, {
    data: { applicantId, templateId, expiryDays },
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Org-Id': orgId,
      'X-User-Id': userId,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok()) {
    throw new Error(`Generate link failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

export async function startTest(request: APIRequestContext, token: string) {
  const res = await request.post(`${ASSESSMENT_BASE}/api/v1/assessment/candidate/start/${token}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  return { ok: res.ok(), status: res.status(), body: res.ok() ? await res.json() : await res.text() };
}

export async function getSessionReport(request: APIRequestContext, token: string, sessionId: string) {
  const res = await request.get(`${ASSESSMENT_BASE}/api/v1/assessment/sessions/${sessionId}/report`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok()) {
    throw new Error(`Get report failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

export async function listSessions(request: APIRequestContext, token: string, orgId: string) {
  const res = await request.get(`${ASSESSMENT_BASE}/api/v1/assessment/sessions`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Org-Id': orgId,
    },
  });
  if (!res.ok()) {
    throw new Error(`List sessions failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

export async function makeHiringDecision(request: APIRequestContext, token: string, sessionId: string, userId: string, decision: string, notes?: string) {
  const res = await request.post(`${ASSESSMENT_BASE}/api/v1/assessment/sessions/${sessionId}/decision`, {
    data: { decision, technicalManagerNotes: notes },
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-User-Id': userId,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok()) {
    throw new Error(`Hiring decision failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

let emailCounter = 0;
export function uniqueEmail(prefix = 'test'): string {
  emailCounter++;
  return `${prefix}_${Date.now()}_${emailCounter}@test.com`;
}
