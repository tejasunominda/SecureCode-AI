import { useState, useMemo } from 'react';
import { useProctoringStream, type ProctoringUpdate } from '@/hooks/useProctoringStream';
import { GlassCard, GlassInput, GlassSelect, GlassButton } from '@/components/ui';
import { Camera, CameraOff, AlertTriangle, ShieldCheck, Wifi, WifiOff, Activity, Search, X } from 'lucide-react';

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

function SessionCard({ update, selected, onSelect }: { update: ProctoringUpdate; selected: boolean; onSelect: (id: string) => void }) {
    return (
        <div className={`rounded-lg border p-3 transition-all hover:border-border-default ${selected ? 'border-accent bg-accent/5' : 'border-border-subtle bg-surface-2'}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onSelect(update.sessionId)}
                        className="h-3 w-3 rounded border-border-default accent-accent"
                    />
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

type RiskFilter = 'all' | 'high' | 'medium' | 'low';

export function MonitoringGrid() {
    const { sessionList, connected, clearSession } = useProctoringStream({ enabled: true });
    const [searchQuery, setSearchQuery] = useState('');
    const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const filteredSessions = useMemo(() => {
        let result = [...sessionList].sort((a, b) => b.riskScore - a.riskScore);

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(s =>
                (s.candidateName?.toLowerCase().includes(q) ?? false) ||
                s.sessionId.toLowerCase().includes(q)
            );
        }

        if (riskFilter !== 'all') {
            result = result.filter(s => {
                if (riskFilter === 'high') return s.riskScore >= 70;
                if (riskFilter === 'medium') return s.riskScore >= 40 && s.riskScore < 70;
                return s.riskScore < 40;
            });
        }

        return result;
    }, [sessionList, searchQuery, riskFilter]);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        setSelectedIds(new Set(filteredSessions.map(s => s.sessionId)));
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
    };

    const bulkDismiss = () => {
        selectedIds.forEach(id => clearSession(id));
        clearSelection();
    };

    const bulkFlag = () => {
        clearSelection();
    };

    const highRiskCount = sessionList.filter(s => s.riskScore >= 70).length;
    const mediumRiskCount = sessionList.filter(s => s.riskScore >= 40 && s.riskScore < 70).length;

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
                    {highRiskCount > 0 && (
                        <span className="text-[10px] text-red-400">{highRiskCount} high</span>
                    )}
                    {mediumRiskCount > 0 && (
                        <span className="text-[10px] text-yellow-400">{mediumRiskCount} medium</span>
                    )}
                </div>
            </div>

            {sessionList.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                        <GlassInput
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name or session ID..."
                            className="pl-8 text-xs"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                    <GlassSelect
                        value={riskFilter}
                        onChange={(e) => setRiskFilter(e.target.value as RiskFilter)}
                        className="text-xs w-auto"
                        options={[
                            { value: 'all', label: 'All Risk Levels' },
                            { value: 'high', label: 'High Risk (70+)' },
                            { value: 'medium', label: 'Medium Risk (40-69)' },
                            { value: 'low', label: 'Low Risk (<40)' },
                        ]}
                    />
                </div>
            )}

            {selectedIds.size > 0 && (
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 p-2">
                    <span className="text-xs text-text-primary">{selectedIds.size} selected</span>
                    <button onClick={selectAll} className="text-[10px] text-accent hover:underline">Select all filtered</button>
                    <button onClick={clearSelection} className="text-[10px] text-text-muted hover:underline">Clear</button>
                    <div className="flex-1" />
                    <GlassButton size="sm" variant="secondary" onClick={bulkDismiss} className="text-[10px]">
                        Dismiss Selected
                    </GlassButton>
                    <GlassButton size="sm" variant="danger" onClick={bulkFlag} className="text-[10px]">
                        Flag for Review
                    </GlassButton>
                </div>
            )}

            {sessionList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                    <ShieldCheck className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-xs">No active sessions being monitored.</p>
                    <p className="text-[10px] mt-1">Monitoring data will appear here when candidates are taking assessments.</p>
                </div>
            ) : filteredSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-text-muted">
                    <Search className="h-6 w-6 mb-2 opacity-50" />
                    <p className="text-xs">No sessions match your filters.</p>
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {filteredSessions.map((s) => (
                        <SessionCard
                            key={s.sessionId}
                            update={s}
                            selected={selectedIds.has(s.sessionId)}
                            onSelect={toggleSelect}
                        />
                    ))}
                </div>
            )}
        </GlassCard>
    );
}
