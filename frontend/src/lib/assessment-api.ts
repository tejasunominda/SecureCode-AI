import { ApiError, tryRefreshToken } from './api';

const ASSESSMENT_BASE_URL = import.meta.env.VITE_ASSESSMENT_API_BASE_URL ?? '';

async function assessmentRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('securecode_access_token');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) ?? {}),
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let res = await fetch(`${ASSESSMENT_BASE_URL}${path}`, { ...options, headers });

    // Token refresh on 401 — use shared tryRefreshToken to avoid duplicate refresh calls
    if (res.status === 401 && !headers['x-retry']) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
            const newToken = localStorage.getItem('securecode_access_token');
            if (newToken) {
                headers['Authorization'] = `Bearer ${newToken}`;
            }
            headers['x-retry'] = 'true';
            res = await fetch(`${ASSESSMENT_BASE_URL}${path}`, { ...options, headers });
        } else {
            // Refresh failed — clear auth and redirect to login
            localStorage.removeItem('securecode_access_token');
            localStorage.removeItem('securecode_refresh_token');
            localStorage.removeItem('securecode_roles');
            if (window.location.pathname.startsWith('/app')) {
                window.location.href = '/login';
            }
        }
    }

    if (!res.ok) {
        let code = 'UNKNOWN';
        let message = 'An unexpected error occurred';
        let field: string | undefined;

        try {
            const body = await res.json();
            const err = body.error ?? body;
            code = err.code ?? code;
            message = err.message ?? message;
            field = err.field;
        } catch {
            // ignore parse errors
        }

        throw new ApiError(res.status, code, message, field);
    }

    return res.json();
}

export interface ApplicantDTO {
    id: string;
    name: string;
    email: string;
    resumeUrl: string | null;
    status: string;
    createdAt: string;
}

export interface AssessmentLinkDTO {
    id: string;
    applicantId: string;
    templateId: string;
    token: string;
    status: string;
    expiresAt: string;
    testUrl: string;
}

export interface SessionReportDTO {
    sessionId: string;
    applicantId: string;
    applicantName: string;
    applicantEmail: string;
    status: string;
    startedAt: string | null;
    submittedAt: string | null;
    aptitudeCorrect: number;
    aptitudeTotal: number;
    reasoningCorrect: number;
    reasoningTotal: number;
    codingResults: CodingResultDTO[];
    proctoringEvents: ProctoringEventDTO[];
    hiringDecision: string | null;
    technicalManagerNotes: string | null;
}

export interface CodingResultDTO {
    questionId: string;
    language: string;
    code: string;
    visibleTestsPassed: number;
    hiddenTestsPassed: number;
    hiddenTestsTotal: number;
    runtimeMs: number;
}

export interface TestCaseResult {
    input: string;
    expectedOutput: string;
    actualOutput: string;
    passed: boolean;
}

export interface RunCodeResponse {
    visiblePassed: number;
    visibleTotal: number;
    hiddenPassed: number;
    hiddenTotal: number;
    visibleResults: TestCaseResult[];
    hiddenResults: TestCaseResult[];
    allVisiblePassed: boolean;
    allHiddenPassed: boolean;
}

export interface ProctoringEventDTO {
    eventType: string;
    warningNumber: number;
    occurredAt: string;
    screenshotData?: string | null;
    detail?: string | null;
}

export interface QuestionDTO {
    id: string;
    type: string;
    body: string;
    optionA: string | null;
    optionB: string | null;
    optionC: string | null;
    optionD: string | null;
    correctOption: string | null;
    difficulty: string;
    tags: string | null;
    testCases: string | null;
    hiddenTestCases: string | null;
    status: string;
    version: number;
    createdAt: string;
}

export interface AssessmentSessionDTO {
    id: string;
    linkId: string;
    applicantId: string;
    templateId: string;
    orgId: string;
    status: string;
    currentSection: string;
    startedAt: string;
    submittedAt: string | null;
}

export const assessmentApi = {
    // Applicant management
    createApplicant: (orgId: string, name: string, email: string, resumeUrl?: string) =>
        assessmentRequest<ApplicantDTO>('/api/v1/assessment/applicants', {
            method: 'POST',
            body: JSON.stringify({ name, email, resumeUrl: resumeUrl ?? null }),
            headers: { 'X-Org-Id': orgId },
        }),

    listApplicants: (orgId: string) =>
        assessmentRequest<ApplicantDTO[]>(`/api/v1/assessment/applicants`, {
            headers: { 'X-Org-Id': orgId },
        }),

    shortlistApplicant: (id: string) =>
        assessmentRequest<ApplicantDTO>(`/api/v1/assessment/applicants/${id}/shortlist`, {
            method: 'PUT',
        }),

    rejectApplicant: (id: string) =>
        assessmentRequest<ApplicantDTO>(`/api/v1/assessment/applicants/${id}/reject`, {
            method: 'PUT',
        }),

    // Link generation
    generateLink: (orgId: string, userId: string, applicantId: string, templateId: string, expiryDays = 5) =>
        assessmentRequest<AssessmentLinkDTO>('/api/v1/assessment/links/generate', {
            method: 'POST',
            body: JSON.stringify({ applicantId, templateId, expiryDays }),
            headers: { 'X-Org-Id': orgId, 'X-User-Id': userId },
        }),

    // Candidate: start test
    startTest: (token: string) =>
        assessmentRequest<AssessmentSessionDTO>(`/api/v1/assessment/candidate/start/${token}`, {
            method: 'POST',
        }),

    // Candidate: submit answer
    submitAnswer: (sessionId: string, questionId: string, selectedOption: string) =>
        assessmentRequest(`/api/v1/assessment/sessions/${sessionId}/answer`, {
            method: 'POST',
            body: JSON.stringify({ questionId, selectedOption }),
        }),

    // Candidate: submit code
    submitCode: (sessionId: string, questionId: string, language: string, code: string) =>
        assessmentRequest(`/api/v1/assessment/sessions/${sessionId}/code`, {
            method: 'POST',
            body: JSON.stringify({ questionId, language, code }),
        }),

    // Candidate: run code (evaluate against test cases)
    runCode: (sessionId: string, questionId: string, language: string, code: string) =>
        assessmentRequest<RunCodeResponse>(`/api/v1/assessment/sessions/${sessionId}/code/run`, {
            method: 'POST',
            body: JSON.stringify({ questionId, language, code }),
        }),

    // Candidate: submit test
    submitTest: (sessionId: string) =>
        assessmentRequest<AssessmentSessionDTO>(`/api/v1/assessment/sessions/${sessionId}/submit`, {
            method: 'POST',
        }),

    // Proctoring
    recordProctoringEvent: (sessionId: string, eventType: string) =>
        assessmentRequest(`/api/v1/assessment/sessions/${sessionId}/proctoring?eventType=${eventType}`, {
            method: 'POST',
        }),

    recordDetailedProctoringEvent: (sessionId: string, data: { eventType: string; screenshotData?: string; audioData?: string; detail?: string }) =>
        assessmentRequest(`/api/v1/assessment/sessions/${sessionId}/proctoring/detailed`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // Questions
    createQuestion: (orgId: string, userId: string, data: { type: string; body: string; optionA?: string; optionB?: string; optionC?: string; optionD?: string; correctOption?: string; difficulty?: string; tags?: string; testCases?: string; hiddenTestCases?: string }) =>
        assessmentRequest<QuestionDTO>('/api/v1/assessment/questions', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'X-Org-Id': orgId, 'X-User-Id': userId },
        }),

    listQuestions: (orgId: string, type?: string) =>
        assessmentRequest<QuestionDTO[]>(`/api/v1/assessment/questions${type ? `?type=${type}` : ''}`, {
            headers: orgId ? { 'X-Org-Id': orgId } : undefined,
        }),

    publishQuestion: (id: string) =>
        assessmentRequest<QuestionDTO>(`/api/v1/assessment/questions/${id}/publish`, {
            method: 'PUT',
        }),

    submitQuestionForReview: (id: string) =>
        assessmentRequest<QuestionDTO>(`/api/v1/assessment/questions/${id}/submit-review`, {
            method: 'PUT',
        }),

    approveQuestion: (id: string) =>
        assessmentRequest<QuestionDTO>(`/api/v1/assessment/questions/${id}/approve`, {
            method: 'PUT',
        }),

    rejectQuestion: (id: string) =>
        assessmentRequest<QuestionDTO>(`/api/v1/assessment/questions/${id}/reject`, {
            method: 'PUT',
        }),

    listQuestionsByStatus: (orgId: string, status: string) =>
        assessmentRequest<QuestionDTO[]>(`/api/v1/assessment/questions/by-status?status=${status}`, {
            headers: { 'X-Org-Id': orgId },
        }),

    // Auto-save / Resume
    autoSave: (sessionId: string, data: { currentSection: string; currentQuestionIndex: number; code: string; language: string; answers: Record<string, string> }) =>
        assessmentRequest(`/api/v1/assessment/sessions/${sessionId}/autosave`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getAutoSave: (sessionId: string) =>
        assessmentRequest<{ currentSection: string; currentQuestionIndex: number; code: string; language: string; answers: Record<string, string>; savedAt: string } | null>(`/api/v1/assessment/sessions/${sessionId}/autosave`),

    // Hiring decision
    makeHiringDecision: (sessionId: string, userId: string, decision: string, technicalManagerNotes?: string) =>
        assessmentRequest(`/api/v1/assessment/sessions/${sessionId}/decision`, {
            method: 'POST',
            body: JSON.stringify({ decision, technicalManagerNotes }),
            headers: { 'X-User-Id': userId },
        }),

    // Reports
    getSessionReport: (sessionId: string) =>
        assessmentRequest<SessionReportDTO>(`/api/v1/assessment/sessions/${sessionId}/report`),

    listSessions: (orgId: string) =>
        assessmentRequest<SessionReportDTO[]>('/api/v1/assessment/sessions', {
            headers: { 'X-Org-Id': orgId },
        }),
};
