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

let refreshPromise: Promise<boolean> | null = null;

export async function tryRefreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('securecode_refresh_token');
    if (!refreshToken) return false;

    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
        try {
            const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });
            if (!res.ok) return false;
            const data = await res.json();
            localStorage.setItem('securecode_access_token', data.accessToken);
            localStorage.setItem('securecode_refresh_token', data.refreshToken);
            if (data.roles) localStorage.setItem('securecode_roles', JSON.stringify(data.roles));
            return true;
        } catch {
            return false;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
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

    let res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

    // Token refresh on 401
    if (res.status === 401 && !(headers as Record<string, string>)['x-retry']) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
            const newToken = localStorage.getItem('securecode_access_token');
            if (newToken) {
                headers['Authorization'] = `Bearer ${newToken}`;
            }
            headers['x-retry'] = 'true';
            res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
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

export const api = {
    post: <T>(path: string, body: unknown) =>
        request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
    get: <T>(path: string) => request<T>(path, { method: 'GET' }),
    put: <T>(path: string, body: unknown) =>
        request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
