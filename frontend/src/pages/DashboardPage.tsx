import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { assessmentApi, type SessionReportDTO, type ApplicantDTO } from '@/lib/assessment-api';
import { GlassCard, GlassBadge, GlassStatCard, GlassButton } from '@/components/ui';
import { Building2, Mail, Shield, Users, FileText, TrendingUp, CheckCircle, Clock, ArrowRight } from 'lucide-react';

export default function DashboardPage() {
    const user = useAuthStore((s) => s.user);
    const navigate = useNavigate();
    const [applicants, setApplicants] = useState<ApplicantDTO[]>([]);
    const [sessions, setSessions] = useState<SessionReportDTO[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!user?.orgId) return;
        try {
            const [apps, sess] = await Promise.all([
                assessmentApi.listApplicants(user.orgId),
                assessmentApi.listSessions(user.orgId),
            ]);
            setApplicants(apps);
            setSessions(sess);
        } catch { /* ignore */ } finally {
            setLoading(false);
        }
    }, [user?.orgId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const completed = sessions.filter((s) => s.status === 'submitted').length;
    const passed = sessions.filter((s) => s.hiringDecision === 'pass').length;
    const pending = completed - passed - sessions.filter((s) => s.hiringDecision === 'fail').length;
    const inProgress = sessions.filter((s) => s.status === 'in_progress').length;
    const proctoringAlerts = sessions.filter((s) => s.proctoringEvents.length > 0).length;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-text-primary">Dashboard</h1>
                <p className="mt-1 text-sm text-text-secondary">Welcome to SecureCode AI — your hiring assessment overview.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <GlassStatCard
                    label="Total Applicants"
                    value={loading ? '—' : applicants.length}
                    icon={<Users className="h-5 w-5 text-text-secondary" />}
                    subtitle={`${applicants.filter((a) => a.status === 'applied').length} new`}
                />
                <GlassStatCard
                    label="Active Sessions"
                    value={loading ? '—' : inProgress}
                    icon={<FileText className="h-5 w-5 text-text-secondary" />}
                    subtitle={`${completed} completed`}
                />
                <GlassStatCard
                    label="Pass Rate"
                    value={loading ? '—' : `${completed ? Math.round((passed / completed) * 100) : 0}%`}
                    icon={<TrendingUp className="h-5 w-5 text-text-secondary" />}
                    progress={{ value: completed ? (passed / completed) * 100 : 0, tone: 'success' }}
                />
                <GlassStatCard
                    label="Pending Decisions"
                    value={loading ? '—' : pending}
                    icon={<Clock className="h-5 w-5 text-text-secondary" />}
                    subtitle="Awaiting review"
                />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <GlassCard static className="p-4 cursor-pointer hover:bg-surface-hover" onClick={() => navigate('/app/hr')}>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                            <Users className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-text-primary">HR Dashboard</p>
                            <p className="text-xs text-text-muted">Manage applicants</p>
                        </div>
                        <ArrowRight className="ml-auto h-4 w-4 text-text-muted" />
                    </div>
                </GlassCard>
                <GlassCard static className="p-4 cursor-pointer hover:bg-surface-hover" onClick={() => navigate('/app/questions')}>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                            <FileText className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-text-primary">Question Bank</p>
                            <p className="text-xs text-text-muted">Create questions</p>
                        </div>
                        <ArrowRight className="ml-auto h-4 w-4 text-text-muted" />
                    </div>
                </GlassCard>
                <GlassCard static className="p-4 cursor-pointer hover:bg-surface-hover" onClick={() => navigate('/app/analytics')}>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                            <TrendingUp className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-text-primary">Analytics</p>
                            <p className="text-xs text-text-muted">View reports</p>
                        </div>
                        <ArrowRight className="ml-auto h-4 w-4 text-text-muted" />
                    </div>
                </GlassCard>
                <GlassCard static className="p-4 cursor-pointer hover:bg-surface-hover" onClick={() => navigate('/app/settings')}>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                            <CheckCircle className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-text-primary">Settings</p>
                            <p className="text-xs text-text-muted">Configure</p>
                        </div>
                        <ArrowRight className="ml-auto h-4 w-4 text-text-muted" />
                    </div>
                </GlassCard>
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

            {/* Proctoring Alert Summary */}
            {proctoringAlerts > 0 && (
                <GlassCard static className="p-5 border-warning/20">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                            <Clock className="h-5 w-5 text-warning" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-text-primary">{proctoringAlerts} session{proctoringAlerts !== 1 ? 's' : ''} with proctoring alerts</p>
                            <p className="text-xs text-text-muted">Review proctoring events in the Proctor Review page</p>
                        </div>
                        <GlassButton variant="secondary" size="sm" onClick={() => navigate('/app/proctor')}>Review</GlassButton>
                    </div>
                </GlassCard>
            )}
        </div>
    );
}
