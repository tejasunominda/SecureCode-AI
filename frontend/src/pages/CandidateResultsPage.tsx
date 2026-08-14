import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { assessmentApi, type SessionReportDTO } from '@/lib/assessment-api';
import { CheckCircle, Clock, Code2, Brain, TrendingUp } from 'lucide-react';

export default function CandidateResultsPage() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [session, setSession] = useState<SessionReportDTO | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!sessionId) return;
        assessmentApi.getSessionReport(sessionId).then((report) => {
            setSession(report);
        }).catch(() => {
            setSession(null);
        }).finally(() => {
            setLoading(false);
        });
    }, [sessionId]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-canvas">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-canvas">
                <div className="text-center">
                    <CheckCircle className="mx-auto h-12 w-12 text-success" />
                    <h1 className="mt-4 text-2xl font-semibold text-text-primary">Test Submitted</h1>
                    <p className="mt-2 text-sm text-text-secondary">Your assessment has been submitted. You will be contacted by the hiring team.</p>
                </div>
            </div>
        );
    }

    const aptitudePct = session.aptitudeTotal > 0 ? Math.round((session.aptitudeCorrect / session.aptitudeTotal) * 100) : 0;
    const reasoningPct = session.reasoningTotal > 0 ? Math.round((session.reasoningCorrect / session.reasoningTotal) * 100) : 0;
    const codingPassed = session.codingResults.reduce((sum, r) => sum + r.hiddenTestsPassed, 0);
    const codingTotal = session.codingResults.reduce((sum, r) => sum + r.hiddenTestsTotal, 0);

    return (
        <div className="flex min-h-screen items-center justify-center bg-canvas p-8">
            <div className="w-full max-w-2xl space-y-6">
                <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                        <CheckCircle className="h-8 w-8 text-success" />
                    </div>
                    <h1 className="mt-4 text-2xl font-bold text-text-primary">Test Submitted Successfully!</h1>
                    <p className="mt-2 text-sm text-text-secondary">Here's a summary of your performance. The hiring team will review your results.</p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-border-subtle bg-surface p-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                                <Brain className="h-5 w-5 text-accent" />
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Aptitude</p>
                                <p className="text-lg font-bold text-text-primary">{session.aptitudeCorrect}/{session.aptitudeTotal}</p>
                            </div>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
                            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${aptitudePct}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-text-muted">{aptitudePct}% correct</p>
                    </div>

                    <div className="rounded-lg border border-border-subtle bg-surface p-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                                <TrendingUp className="h-5 w-5 text-accent" />
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Reasoning</p>
                                <p className="text-lg font-bold text-text-primary">{session.reasoningCorrect}/{session.reasoningTotal}</p>
                            </div>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
                            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${reasoningPct}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-text-muted">{reasoningPct}% correct</p>
                    </div>
                </div>

                {session.codingResults.length > 0 && (
                    <div className="rounded-lg border border-border-subtle bg-surface p-5">
                        <div className="mb-3 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                                <Code2 className="h-5 w-5 text-accent" />
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Coding</p>
                                <p className="text-lg font-bold text-text-primary">{codingPassed}/{codingTotal} hidden tests passed</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {session.codingResults.map((r, i) => (
                                <div key={i} className="flex items-center justify-between rounded-md bg-surface-2 p-2.5">
                                    <div className="flex items-center gap-2">
                                        <Code2 className="h-3.5 w-3.5 text-text-muted" />
                                        <span className="text-xs font-medium text-text-primary">Question {i + 1}</span>
                                        <span className="text-xs text-text-muted">({r.language})</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                        <span className="text-text-muted">Visible: {r.visibleTestsPassed}</span>
                                        <span className={r.hiddenTestsPassed === r.hiddenTestsTotal ? 'text-success' : 'text-warning'}>
                                            Hidden: {r.hiddenTestsPassed}/{r.hiddenTestsTotal}
                                        </span>
                                        <span className="text-text-muted">{r.runtimeMs}ms</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Submitted at {session.submittedAt ? new Date(session.submittedAt).toLocaleString() : '—'}</span>
                </div>
            </div>
        </div>
    );
}
