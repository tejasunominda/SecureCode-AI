const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081';

export class ApiError extends Error {
    constructor(
        public status: number,
        public code: string,
        message: string,
        public field?: string,
    ) {
        super(message);
    }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('securecode_access_token');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) ?? {}),
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

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

export const api = {
    post: <T>(path: string, body: unknown) =>
        request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
    get: <T>(path: string) => request<T>(path, { method: 'GET' }),
    put: <T>(path: string, body: unknown) =>
        request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
