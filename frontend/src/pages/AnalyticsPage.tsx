import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { assessmentApi, type SessionReportDTO } from '@/lib/assessment-api';
import { GlassCard, GlassButton, GlassBadge, GlassStatCard, GlassBarChart, GlassDonutChart, GlassSelect } from '@/components/ui';
import { toast } from '@/components/ui/toast/useToastStore';
import { exportToCSV, exportToHTML, downloadReport } from '@/lib/export-utils';
import { computeAnalytics, getScoreDistribution, getHiringFunnel, getStatusBreakdown, getTopPerformers, getProctoringAlerts } from '@/lib/analytics-utils';
import { FileText, TrendingUp, CheckCircle, Clock, AlertTriangle, Download, FileSpreadsheet, BarChart3, FileType } from 'lucide-react';

export default function AnalyticsPage() {
  const user = useAuthStore((s) => s.user);
  const [sessions, setSessions] = useState<SessionReportDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');

  const fetchData = useCallback(async () => {
    if (!user?.orgId) return;
    try {
      const sess = await assessmentApi.listSessions(user.orgId);
      setSessions(sess);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [user?.orgId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredSessions = useMemo(() => {
    if (timeRange === 'all') return sessions;
    const now = Date.now();
    const ranges: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
    const days = ranges[timeRange];
    if (!days) return sessions;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return sessions.filter((s) => s.startedAt && new Date(s.startedAt).getTime() > cutoff);
  }, [sessions, timeRange]);

  const analytics = useMemo(() => computeAnalytics(filteredSessions), [filteredSessions]);
  const scoreDist = useMemo(() => getScoreDistribution(filteredSessions), [filteredSessions]);
  const funnel = useMemo(() => getHiringFunnel(filteredSessions), [filteredSessions]);
  const statusBreakdown = useMemo(() => getStatusBreakdown(filteredSessions), [filteredSessions]);
  const topPerformers = useMemo(() => getTopPerformers(filteredSessions), [filteredSessions]);
  const proctoringAlerts = useMemo(() => getProctoringAlerts(filteredSessions), [filteredSessions]);

  const handleExportCSV = () => {
    const headers = ['Candidate', 'Email', 'Status', 'Aptitude', 'Reasoning', 'Coding Submissions', 'Decision', 'Proctoring Events', 'Started', 'Submitted'];
    const rows = filteredSessions.map((s) => [
      s.applicantName, s.applicantEmail, s.status,
      `${s.aptitudeCorrect}/${s.aptitudeTotal}`, `${s.reasoningCorrect}/${s.reasoningTotal}`,
      s.codingResults.length, s.hiringDecision ?? 'pending',
      s.proctoringEvents.length, s.startedAt ?? '', s.submittedAt ?? '',
    ]);
    exportToCSV(`analytics-${timeRange}-${Date.now()}.csv`, headers, rows);
    toast.success('Analytics exported to CSV');
  };

  const handleExportReport = () => {
    const bodyHTML = `
      <div class="stats-grid">
        ${[
          { label: 'Total Sessions', value: analytics.totalSessions },
          { label: 'Completed', value: analytics.completedSessions },
          { label: 'Pass Rate', value: `${analytics.passRate}%` },
          { label: 'Avg Aptitude', value: `${analytics.avgAptitudeScore}%` },
          { label: 'Avg Reasoning', value: `${analytics.avgReasoningScore}%` },
          { label: 'Coding Submissions', value: analytics.totalCodingSubmissions },
        ].map((s) => `<div class="stat-card"><h3>${s.label}</h3><p class="score">${s.value}</p></div>`).join('')}
      </div>
      <h2>Top Performers</h2>
      <table><tr><th>Rank</th><th>Name</th><th>Score</th><th>Decision</th></tr>
      ${topPerformers.map((p, i) => `<tr><td>${i + 1}</td><td>${p.applicantName}</td><td>${p.totalPct}%</td><td><span class="badge badge-${p.hiringDecision ?? 'pending'}">${p.hiringDecision ?? 'pending'}</span></td></tr>`).join('')}
      </table>
      <h2>Proctoring Alerts</h2>
      <table><tr><th>Candidate</th><th>Events</th></tr>
      ${proctoringAlerts.map((a) => `<tr><td>${a.name}</td><td>${a.events}</td></tr>`).join('')}
      </table>
    `;
    exportToHTML(`analytics-report-${Date.now()}.html`, 'SecureCode AI — Analytics Report', bodyHTML);
    toast.success('Report exported');
  };

  const handleExportPDF = async () => {
    if (!user?.orgId) return;
    try {
      await downloadReport(`/api/v1/reporting/orgs/${user.orgId}/analytics/export`, 'pdf', `org-analytics-${Date.now()}.pdf`);
      toast.success('PDF report downloaded');
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'PDF export failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Analytics & Reports</h1>
          <p className="mt-1 text-sm text-text-secondary">Hiring metrics, score distributions, and performance insights</p>
        </div>
        <div className="flex items-center gap-2">
          <GlassSelect
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            options={[
              { value: 'all', label: 'All time' },
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' },
            ]}
            className="w-40"
          />
          <GlassButton variant="secondary" size="sm" onClick={handleExportCSV}>
            <FileSpreadsheet className="h-4 w-4" /> CSV
          </GlassButton>
          <GlassButton variant="secondary" size="sm" onClick={handleExportPDF}>
            <FileType className="h-4 w-4" /> PDF
          </GlassButton>
          <GlassButton variant="secondary" size="sm" onClick={handleExportReport}>
            <Download className="h-4 w-4" /> Report
          </GlassButton>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <GlassStatCard label="Total Sessions" value={analytics.totalSessions} icon={<FileText className="h-5 w-5 text-text-secondary" />} subtitle={`${analytics.inProgressSessions} in progress`} />
        <GlassStatCard label="Completed" value={analytics.completedSessions} icon={<CheckCircle className="h-5 w-5 text-text-secondary" />} progress={{ value: analytics.completionRate, tone: 'success' }} />
        <GlassStatCard label="Pass Rate" value={`${analytics.passRate}%`} icon={<TrendingUp className="h-5 w-5 text-text-secondary" />} progress={{ value: analytics.passRate, tone: analytics.passRate >= 50 ? 'success' : 'warning' }} />
        <GlassStatCard label="Pending Decisions" value={analytics.pendingDecisions} icon={<Clock className="h-5 w-5 text-text-secondary" />} subtitle="Awaiting review" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <GlassStatCard label="Avg Aptitude" value={`${analytics.avgAptitudeScore}%`} icon={<BarChart3 className="h-5 w-5 text-text-secondary" />} />
        <GlassStatCard label="Avg Reasoning" value={`${analytics.avgReasoningScore}%`} icon={<BarChart3 className="h-5 w-5 text-text-secondary" />} />
        <GlassStatCard label="Coding Submissions" value={analytics.totalCodingSubmissions} icon={<FileText className="h-5 w-5 text-text-secondary" />} />
        <GlassStatCard label="Proctoring Alerts" value={proctoringAlerts.length} icon={<AlertTriangle className="h-5 w-5 text-text-secondary" />} subtitle={`${proctoringAlerts.reduce((s, a) => s + a.events, 0)} total events`} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GlassCard static className="p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">Hiring Funnel</h2>
          <GlassBarChart data={funnel.map((f, i) => ({ label: f.label, value: f.value, color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][i] }))} height={220} />
        </GlassCard>

        <GlassCard static className="p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">Score Distribution</h2>
          <GlassBarChart data={scoreDist.map((s, i) => ({ label: s.label, value: s.value, color: ['#ef4444', '#f59e0b', '#f59e0b', '#10b981', '#10b981'][i] }))} height={220} />
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GlassCard static className="p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">Status Breakdown</h2>
          <GlassDonutChart data={statusBreakdown} size={180} />
        </GlassCard>

        <GlassCard static className="p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">Top Performers</h2>
          {topPerformers.length === 0 ? (
            <p className="text-sm text-text-muted">No completed sessions yet.</p>
          ) : (
            <div className="space-y-2">
              {topPerformers.map((p, i) => (
                <div key={p.sessionId} className="flex items-center gap-3 rounded-md border border-border-subtle bg-surface-2 p-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-yellow-500/20 text-yellow-500' : i === 1 ? 'bg-gray-400/20 text-gray-400' : i === 2 ? 'bg-orange-500/20 text-orange-500' : 'bg-surface text-text-muted'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">{p.applicantName}</p>
                    <p className="text-xs text-text-muted">{p.applicantEmail}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-text-primary">{p.totalPct}%</p>
                    <p className="text-xs text-text-muted">Apt: {p.aptitudeCorrect}/{p.aptitudeTotal} • Rea: {p.reasoningCorrect}/{p.reasoningTotal}</p>
                  </div>
                  {p.hiringDecision && (
                    <GlassBadge tone={p.hiringDecision === 'pass' ? 'success' : 'danger'}>{p.hiringDecision}</GlassBadge>
                  )}
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Proctoring Alerts */}
      <GlassCard static className="p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">Proctoring Alerts</h2>
        {proctoringAlerts.length === 0 ? (
          <p className="text-sm text-text-muted">No proctoring issues detected. All sessions are clean.</p>
        ) : (
          <div className="space-y-2">
            {proctoringAlerts.map((a) => (
              <div key={a.sessionId} className="flex items-center gap-3 rounded-md border border-border-subtle bg-surface-2 p-3">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="flex-1 text-sm text-text-primary">{a.name}</span>
                <GlassBadge tone={a.events > 3 ? 'danger' : 'warning'}>{a.events} event{a.events !== 1 ? 's' : ''}</GlassBadge>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

