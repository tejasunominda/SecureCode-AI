import { useProctoringStream, type ProctoringUpdate } from '@/hooks/useProctoringStream';
import { GlassCard } from '@/components/ui';
import { Camera, CameraOff, AlertTriangle, ShieldCheck, Wifi, WifiOff, Activity } from 'lucide-react';

function getRiskColor(score: number): string {
    if (score >= 70) return 'text-red-400 bg-red-500/10';
    if (score >= 40) return 'text-yellow-400 bg-yellow-500/10';
    return 'text-green-400 bg-green-500/10';
}

function getRiskLabel(score: number): string {
    if (score >= 70) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
}

function SessionCard({ update }: { update: ProctoringUpdate }) {
    return (
        <div className="rounded-lg border border-border-subtle bg-surface-2 p-3 transition-all hover:border-border-default">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {update.cameraActive ? (
                        <Camera className="h-3.5 w-3.5 text-green-400" />
                    ) : (
                        <CameraOff className="h-3.5 w-3.5 text-red-400" />
                    )}
                    <span className="text-xs font-medium text-text-primary truncate max-w-[120px]">
                        {update.candidateName ?? update.sessionId.slice(0, 8)}
                    </span>
                </div>
                <div className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${getRiskColor(update.riskScore)}`}>
                    {getRiskLabel(update.riskScore)} ({update.riskScore})
                </div>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-text-muted">
                <span className="flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    {update.eventType}
                </span>
                {update.warnings > 0 && (
                    <span className="flex items-center gap-1 text-yellow-500">
                        <AlertTriangle className="h-3 w-3" />
                        {update.warnings} warning{update.warnings > 1 ? 's' : ''}
                    </span>
                )}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
                <div className="h-1.5 flex-1 rounded-full bg-surface overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${
                            update.riskScore >= 70 ? 'bg-red-500' :
                            update.riskScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(100, update.riskScore)}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

export function MonitoringGrid() {
    const { sessionList, connected } = useProctoringStream({ enabled: true });

    const sortedSessions = [...sessionList].sort((a, b) => b.riskScore - a.riskScore);

    return (
        <GlassCard static className="p-6">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-accent" />
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                        Live Proctoring Monitor
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    {connected ? (
                        <span className="flex items-center gap-1 text-[10px] text-green-400">
                            <Wifi className="h-3 w-3" /> Connected
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-[10px] text-gray-500">
                            <WifiOff className="h-3 w-3" /> Disconnected
                        </span>
                    )}
                    <span className="text-[10px] text-text-muted">{sessionList.length} active</span>
                </div>
            </div>

            {sessionList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                    <ShieldCheck className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-xs">No active sessions being monitored.</p>
                    <p className="text-[10px] mt-1">Monitoring data will appear here when candidates are taking assessments.</p>
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {sortedSessions.map((s) => (
                        <SessionCard key={s.sessionId} update={s} />
                    ))}
                </div>
            )}
        </GlassCard>
    );
}
