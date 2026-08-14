import { create } from 'zustand';
import { api } from '@/lib/api';

export interface AuthUser {
    userId: string;
    orgId: string;
    email: string;
    roles: string[];
}

interface AuthState {
    user: AuthUser | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    login: (orgId: string, email: string, password: string) => Promise<void>;
    register: (email: string, password: string, orgName: string, role: string) => Promise<void>;
    refresh: () => Promise<void>;
    logout: () => void;
    restore: () => void;
}

interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    userId: string;
    orgId: string;
    email: string;
    roles: string[];
}

function getInitialAuthState() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('securecode_access_token') : null;
    const orgId = typeof localStorage !== 'undefined' ? localStorage.getItem('securecode_org_id') : null;
    const userId = typeof localStorage !== 'undefined' ? localStorage.getItem('securecode_user_id') : null;
    const email = typeof localStorage !== 'undefined' ? localStorage.getItem('securecode_email') : null;
    const rolesStr = typeof localStorage !== 'undefined' ? localStorage.getItem('securecode_roles') : null;
    let roles: string[] = [];
    try { roles = rolesStr ? JSON.parse(rolesStr) : []; } catch { roles = []; }
    if (token && orgId) {
        return {
            user: { userId: userId ?? '', orgId, email: email ?? '', roles } as AuthUser,
            accessToken: token,
            refreshToken: localStorage.getItem('securecode_refresh_token'),
            isAuthenticated: true,
        };
    }
    return {
        user: null as AuthUser | null,
        accessToken: null as string | null,
        refreshToken: null as string | null,
        isAuthenticated: false,
    };
}

const initial = getInitialAuthState();

export const useAuthStore = create<AuthState>((set, get) => ({
    user: initial.user,
    accessToken: initial.accessToken,
    refreshToken: initial.refreshToken,
    isAuthenticated: initial.isAuthenticated,

    login: async (orgId, email, password) => {
        const res = await api.post<AuthResponse>('/api/v1/auth/login', { orgId, email, password });
        localStorage.setItem('securecode_access_token', res.accessToken);
        localStorage.setItem('securecode_refresh_token', res.refreshToken);
        localStorage.setItem('securecode_org_id', res.orgId);
        localStorage.setItem('securecode_user_id', res.userId);
        localStorage.setItem('securecode_email', res.email);
        localStorage.setItem('securecode_roles', JSON.stringify(res.roles));
        set({
            user: { userId: res.userId, orgId: res.orgId, email: res.email, roles: res.roles },
            accessToken: res.accessToken,
            refreshToken: res.refreshToken,
            isAuthenticated: true,
        });
    },

    register: async (email, password, orgName, role) => {
        const res = await api.post<AuthResponse>('/api/v1/auth/register', { email, password, orgName, role });
        localStorage.setItem('securecode_access_token', res.accessToken);
        localStorage.setItem('securecode_refresh_token', res.refreshToken);
        localStorage.setItem('securecode_org_id', res.orgId);
        localStorage.setItem('securecode_user_id', res.userId);
        localStorage.setItem('securecode_email', res.email);
        localStorage.setItem('securecode_roles', JSON.stringify(res.roles));
        set({
            user: { userId: res.userId, orgId: res.orgId, email: res.email, roles: res.roles },
            accessToken: res.accessToken,
            refreshToken: res.refreshToken,
            isAuthenticated: true,
        });
    },

    refresh: async () => {
        const token = localStorage.getItem('securecode_refresh_token');
        if (!token) return;
        try {
            const res = await api.post<AuthResponse>('/api/v1/auth/refresh', { refreshToken: token });
            localStorage.setItem('securecode_access_token', res.accessToken);
            localStorage.setItem('securecode_refresh_token', res.refreshToken);
            localStorage.setItem('securecode_roles', JSON.stringify(res.roles));
            set({
                user: { userId: res.userId, orgId: res.orgId, email: res.email, roles: res.roles },
                accessToken: res.accessToken,
                refreshToken: res.refreshToken,
                isAuthenticated: true,
            });
        } catch {
            get().logout();
        }
    },

    logout: () => {
        localStorage.removeItem('securecode_access_token');
        localStorage.removeItem('securecode_refresh_token');
        localStorage.removeItem('securecode_org_id');
        localStorage.removeItem('securecode_user_id');
        localStorage.removeItem('securecode_email');
        localStorage.removeItem('securecode_roles');
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
    },

    restore: () => {
        const token = localStorage.getItem('securecode_access_token');
        const orgId = localStorage.getItem('securecode_org_id');
        const userId = localStorage.getItem('securecode_user_id');
        const email = localStorage.getItem('securecode_email');
        const rolesStr = localStorage.getItem('securecode_roles');
        let roles: string[] = [];
        try { roles = rolesStr ? JSON.parse(rolesStr) : []; } catch { roles = []; }
        if (token) {
            const existing = get().user;
            set({
                accessToken: token,
                isAuthenticated: true,
                user: existing
                    ? { ...existing, orgId: orgId ?? existing.orgId, userId: userId ?? existing.userId, email: email ?? existing.email, roles: roles.length ? roles : existing.roles }
                    : orgId
                    ? { userId: userId ?? '', orgId, email: email ?? '', roles }
                    : null,
            });
        }
    },
}));
