import { useAuthStore } from '@/stores/useAuthStore';
import { GlassCard, GlassBadge } from '@/components/ui';

export default function DashboardPage() {
    const user = useAuthStore((s) => s.user);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
                <p className="mt-1 text-sm text-text-secondary">Welcome to SecureCode AI</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <GlassCard className="p-6">
                    <p className="text-sm text-text-secondary">Organization ID</p>
                    <p className="mt-2 truncate font-mono text-sm text-text-primary">{user?.orgId ?? '—'}</p>
                </GlassCard>
                <GlassCard className="p-6">
                    <p className="text-sm text-text-secondary">Email</p>
                    <p className="mt-2 text-sm text-text-primary">{user?.email ?? '—'}</p>
                </GlassCard>
                <GlassCard className="p-6">
                    <p className="text-sm text-text-secondary">Roles</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {user?.roles.map((r) => (
                            <GlassBadge key={r} tone="info">{r}</GlassBadge>
                        )) ?? <span className="text-sm text-text-muted">—</span>}
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
