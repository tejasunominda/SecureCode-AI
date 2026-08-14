import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { assessmentApi, type SessionReportDTO, type ProctoringEventDTO } from '@/lib/assessment-api';
import { GlassCard, GlassButton, GlassBadge, GlassTable, GlassTabs, GlassModal, GlassSelect } from '@/components/ui';
import { toast } from '@/components/ui/toast/useToastStore';
import { exportToCSV } from '@/lib/export-utils';
import { Shield, AlertTriangle, Eye, Download, Filter, Video, Camera, Mic } from 'lucide-react';

export default function ProctorReviewPage() {
  const user = useAuthStore((s) => s.user);
  const [sessions, setSessions] = useState<SessionReportDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('alerts');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedSession, setSelectedSession] = useState<SessionReportDTO | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.orgId) return;
    try {
      const sess = await assessmentApi.listSessions(user.orgId);
      setSessions(sess);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [user?.orgId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sessionsWithAlerts = useMemo(() => {
    return sessions.filter((s) => s.proctoringEvents.length > 0).sort((a, b) => b.proctoringEvents.length - a.proctoringEvents.length);
  }, [sessions]);

  const allEvents = useMemo(() => {
    const events: Array<{ session: SessionReportDTO; event: ProctoringEventDTO }> = [];
    for (const s of sessionsWithAlerts) {
      for (const e of s.proctoringEvents) {
        events.push({ session: s, event: e });
      }
    }
    return events.sort((a, b) => new Date(b.event.occurredAt).getTime() - new Date(a.event.occurredAt).getTime());
  }, [sessionsWithAlerts]);

  const filteredEvents = useMemo(() => {
    if (severityFilter === 'all') return allEvents;
    if (severityFilter === 'high') return allEvents.filter((e) => e.event.eventType.includes('face') || e.event.eventType.includes('tab') || e.event.eventType.includes('terminate'));
    if (severityFilter === 'medium') return allEvents.filter((e) => e.event.eventType.includes('copy') || e.event.eventType.includes('paste') || e.event.eventType.includes('right_click') || e.event.eventType.includes('devtools'));
    if (severityFilter === 'low') return allEvents.filter((e) => e.event.eventType.includes('screenshot') || e.event.eventType.includes('audio'));
    return allEvents;
  }, [allEvents, severityFilter]);

  const getEventTone = (type: string): 'danger' | 'warning' | 'neutral' | 'info' => {
    if (type.includes('terminate') || type.includes('no_face') || type.includes('multi_face')) return 'danger';
    if (type.includes('tab') || type.includes('copy') || type.includes('paste') || type.includes('devtools')) return 'warning';
    if (type.includes('screenshot') || type.includes('audio')) return 'neutral';
    return 'info';
  };

  const getEventIcon = (type: string) => {
    if (type.includes('face')) return <Eye className="h-3.5 w-3.5" />;
    if (type.includes('screenshot')) return <Camera className="h-3.5 w-3.5" />;
    if (type.includes('audio')) return <Mic className="h-3.5 w-3.5" />;
    if (type.includes('screen')) return <Video className="h-3.5 w-3.5" />;
    return <AlertTriangle className="h-3.5 w-3.5" />;
  };

  const handleExport = () => {
    const headers = ['Candidate', 'Email', 'Event Type', 'Warning #', 'Timestamp'];
    const rows = allEvents.map((e) => [e.session.applicantName, e.session.applicantEmail, e.event.eventType, e.event.warningNumber, e.event.occurredAt]);
    exportToCSV(`proctoring-events-${Date.now()}.csv`, headers, rows);
    toast.success('Proctoring events exported');
  };

  if (loading) {
    return <div className="flex justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Proctor Review</h1>
          <p className="mt-1 text-sm text-text-secondary">Review proctoring alerts and violations across all sessions</p>
        </div>
        <GlassButton variant="secondary" size="sm" onClick={handleExport}><Download className="h-4 w-4" /> Export</GlassButton>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <GlassCard static className="p-4">
          <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-text-secondary" /><span className="text-xs text-text-muted">Sessions with Alerts</span></div>
          <p className="mt-2 text-2xl font-bold text-text-primary">{sessionsWithAlerts.length}</p>
        </GlassCard>
        <GlassCard static className="p-4">
          <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-danger" /><span className="text-xs text-text-muted">Total Events</span></div>
          <p className="mt-2 text-2xl font-bold text-text-primary">{allEvents.length}</p>
        </GlassCard>
        <GlassCard static className="p-4">
          <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /><span className="text-xs text-text-muted">High Severity</span></div>
          <p className="mt-2 text-2xl font-bold text-warning">{allEvents.filter((e) => e.event.eventType.includes('face') || e.event.eventType.includes('terminate')).length}</p>
        </GlassCard>
        <GlassCard static className="p-4">
          <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-success" /><span className="text-xs text-text-muted">Clean Sessions</span></div>
          <p className="mt-2 text-2xl font-bold text-success">{sessions.length - sessionsWithAlerts.length}</p>
        </GlassCard>
      </div>

      <GlassTabs
        tabs={[
          { value: 'alerts', label: 'All Alerts', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
          { value: 'sessions', label: 'By Session', icon: <Shield className="h-3.5 w-3.5" /> },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'alerts' && (
        <>
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-text-muted" />
            <GlassSelect value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All severities' },
                { value: 'high', label: 'High (face/tab/terminate)' },
                { value: 'medium', label: 'Medium (copy/paste/devtools)' },
                { value: 'low', label: 'Low (screenshot/audio)' },
              ]}
              className="w-64" />
            <span className="text-xs text-text-muted">{filteredEvents.length} events</span>
          </div>

          <GlassTable
            columns={[
              { key: 'candidate', header: 'Candidate', render: ({ session }) => (
                <div><p className="text-sm text-text-primary">{session.applicantName}</p><p className="text-xs text-text-muted">{session.applicantEmail}</p></div>
              )},
              { key: 'event', header: 'Event', render: ({ event }) => (
                <div className="flex items-center gap-2">
                  {getEventIcon(event.eventType)}
                  <GlassBadge tone={getEventTone(event.eventType)}>{event.eventType.replace(/_/g, ' ')}</GlassBadge>
                </div>
              )},
              { key: 'warning', header: 'Warning #', render: ({ event }) => <span className="text-xs text-text-muted">#{event.warningNumber}</span> },
              { key: 'time', header: 'Time', render: ({ event }) => <span className="text-xs text-text-muted">{new Date(event.occurredAt).toLocaleString()}</span> },
              { key: 'actions', header: '', render: ({ session }) => (
                <button onClick={() => { setSelectedSession(session); setShowDetailModal(true); }} className="rounded p-1.5 text-text-secondary hover:bg-surface-hover" title="View session">
                  <Eye className="h-3.5 w-3.5" />
                </button>
              )},
            ]}
            rows={filteredEvents}
            rowKey={({ session, event }) => `${session.sessionId}-${event.occurredAt}`}
            emptyMessage="No proctoring alerts found. All sessions are clean!"
          />
        </>
      )}

      {activeTab === 'sessions' && (
        <GlassTable
          columns={[
            { key: 'candidate', header: 'Candidate', render: (s) => (
              <div><p className="text-sm text-text-primary">{s.applicantName}</p><p className="text-xs text-text-muted">{s.applicantEmail}</p></div>
            )},
            { key: 'status', header: 'Status', render: (s) => <GlassBadge tone={s.status === 'submitted' ? 'success' : s.status === 'in_progress' ? 'info' : 'neutral'}>{s.status}</GlassBadge> },
            { key: 'events', header: 'Events', render: (s) => <span className="text-sm font-medium text-text-primary">{s.proctoringEvents.length}</span> },
            { key: 'severity', header: 'Max Severity', render: (s) => {
              const maxType = s.proctoringEvents.reduce((max, e) => {
                const tone = getEventTone(e.eventType);
                if (tone === 'danger') return 'danger';
                if (tone === 'warning' && max !== 'danger') return 'warning';
                if (tone === 'neutral' && max === 'info') return 'neutral';
                return max;
              }, 'info');
              return <GlassBadge tone={maxType as any}>{maxType}</GlassBadge>;
            }},
            { key: 'actions', header: '', render: (s) => (
              <button onClick={() => { setSelectedSession(s); setShowDetailModal(true); }} className="rounded p-1.5 text-text-secondary hover:bg-surface-hover" title="View details">
                <Eye className="h-3.5 w-3.5" />
              </button>
            )},
          ]}
          rows={sessionsWithAlerts}
          rowKey={(s) => s.sessionId}
          emptyMessage="No sessions with proctoring alerts."
        />
      )}

      {/* Detail Modal */}
      <GlassModal open={showDetailModal} onClose={() => setShowDetailModal(false)} title="Proctoring Details" className="max-w-2xl">
        {selectedSession && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="rounded-md bg-surface-2 p-3">
              <p className="text-sm font-medium text-text-primary">{selectedSession.applicantName}</p>
              <p className="text-xs text-text-muted">{selectedSession.applicantEmail}</p>
              <div className="mt-2 flex gap-2">
                <GlassBadge tone={selectedSession.status === 'submitted' ? 'success' : 'info'}>{selectedSession.status}</GlassBadge>
                <GlassBadge tone="neutral">{selectedSession.proctoringEvents.length} events</GlassBadge>
              </div>
            </div>
            <div className="space-y-2">
              {selectedSession.proctoringEvents.map((e, i) => (
                <div key={i} className="rounded-md border border-border-subtle bg-surface-2 p-3">
                  <div className="flex items-center gap-3">
                    {getEventIcon(e.eventType)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <GlassBadge tone={getEventTone(e.eventType)}>{e.eventType.replace(/_/g, ' ')}</GlassBadge>
                        <span className="text-xs text-text-muted">Warning #{e.warningNumber}</span>
                      </div>
                      <p className="mt-1 text-xs text-text-muted">{new Date(e.occurredAt).toLocaleString()}</p>
                      {e.detail && <p className="mt-1 text-xs text-text-secondary">{e.detail}</p>}
                    </div>
                  </div>
                  {e.screenshotData && (
                    <div className="mt-2">
                      <img
                        src={e.screenshotData}
                        alt={`Screenshot at ${new Date(e.occurredAt).toLocaleString()}`}
                        className="w-full rounded-md border border-border-subtle"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassModal>
    </div>
  );
}
