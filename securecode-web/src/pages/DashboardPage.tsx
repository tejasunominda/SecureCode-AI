import { useAuthStore } from '@/stores/useAuthStore';
import { GlassCard, GlassBadge } from '@/components/ui';
import { Building2, Mail, Shield, Users, FileText, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
    const user = useAuthStore((s) => s.user);

    const stats = [
        { label: 'Total Applicants', value: '—', icon: <Users className="h-5 w-5" />, tone: 'info' as const },
        { label: 'Active Sessions', value: '—', icon: <FileText className="h-5 w-5" />, tone: 'neutral' as const },
        { label: 'Hiring Decisions', value: '—', icon: <TrendingUp className="h-5 w-5" />, tone: 'success' as const },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-text-primary">Dashboard</h1>
                <p className="mt-1 text-sm text-text-secondary">Welcome to SecureCode AI — your hiring assessment overview.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {stats.map((stat) => (
                    <GlassCard key={stat.label} static className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{stat.label}</p>
                                <p className="mt-2 text-3xl font-bold text-text-primary">{stat.value}</p>
                            </div>
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-2">
                                {stat.icon}
                            </div>
                        </div>
                    </GlassCard>
                ))}
            </div>

            {/* Account Info */}
            <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Account Information</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <GlassCard static className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2">
                                <Building2 className="h-5 w-5 text-text-secondary" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Organization ID</p>
                                <p className="mt-0.5 truncate font-mono text-xs text-text-primary">{user?.orgId ?? '—'}</p>
                            </div>
                        </div>
                    </GlassCard>
                    <GlassCard static className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2">
                                <Mail className="h-5 w-5 text-text-secondary" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Email</p>
                                <p className="mt-0.5 truncate text-sm text-text-primary">{user?.email || '—'}</p>
                            </div>
                        </div>
                    </GlassCard>
                    <GlassCard static className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2">
                                <Shield className="h-5 w-5 text-text-secondary" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Roles</p>
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                    {user?.roles.map((r) => (
                                        <GlassBadge key={r} tone="info">{r}</GlassBadge>
                                    )) ?? <span className="text-sm text-text-muted">—</span>}
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
