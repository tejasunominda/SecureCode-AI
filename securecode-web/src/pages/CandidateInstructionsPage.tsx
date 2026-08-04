import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assessmentApi } from '@/lib/assessment-api';
import { GlassCard, GlassButton } from '@/components/ui';
import { toast } from '@/components/ui/toast/useToastStore';
import { ShieldCheck, Camera, Mic, AlertCircle, ArrowRight, Clock, Monitor } from 'lucide-react';

const RULES = [
    { icon: <Monitor className="h-4 w-4" />, text: 'You must remain on the test tab for the entire duration. Switching tabs will be flagged.' },
    { icon: <Camera className="h-4 w-4" />, text: 'Your webcam must stay on. Your face must be visible and centered at all times.' },
    { icon: <ShieldCheck className="h-4 w-4" />, text: 'Only one person should be visible in the camera frame.' },
    { icon: <AlertCircle className="h-4 w-4" />, text: 'No external resources, notes, or communication tools are allowed.' },
    { icon: <Clock className="h-4 w-4" />, text: 'The test has three sections: Aptitude, Reasoning, and Coding — each with a time limit.' },
    { icon: <AlertCircle className="h-4 w-4" />, text: 'You cannot pause or restart the assessment once it begins.' },
    { icon: <AlertCircle className="h-4 w-4" />, text: 'Three proctoring warnings for face detection issues will terminate your test.' },
    { icon: <AlertCircle className="h-4 w-4" />, text: 'Two tab-switch warnings will terminate your test.' },
];

export default function CandidateInstructionsPage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [consent, setConsent] = useState(false);
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleStart = async () => {
        if (!token) return;
        setStarting(true);
        setError(null);
        try {
            const session = await assessmentApi.startTest(token);
            navigate(`/test/${session.id}/aptitude`);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to start test';
            setError(message);
            toast.danger(message);
        } finally {
            setStarting(false);
        }
    };

    return (
        <div className="min-h-screen bg-canvas">
            {/* Header */}
            <header className="border-b border-border-subtle bg-surface">
                <div className="mx-auto flex max-w-3xl items-center gap-2.5 px-6 py-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shadow-sm">
                        <ShieldCheck className="h-5 w-5 text-accent-text" />
                    </div>
                    <span className="text-sm font-bold tracking-tight text-text-primary">SecureCode AI</span>
                    <span className="ml-auto text-xs text-text-muted">Candidate Assessment</span>
                </div>
            </header>

            <div className="mx-auto max-w-3xl px-6 py-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-text-primary">Fresher Hiring Assessment</h1>
                    <p className="mt-2 text-base text-text-secondary">
                        Before you begin, please review the rules and give your consent.
                    </p>
                </div>

                {/* Rules */}
                <GlassCard static className="mb-6 p-6">
                    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">Test Rules</h2>
                    <ul className="space-y-3">
                        {RULES.map((rule, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-surface-2 text-text-secondary">
                                    {rule.icon}
                                </div>
                                <span className="text-sm leading-relaxed text-text-secondary">{rule.text}</span>
                            </li>
                        ))}
                    </ul>
                </GlassCard>

                {/* System Check */}
                <GlassCard static className="mb-6 p-6">
                    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">System Check</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 rounded-md border border-border-subtle bg-surface-2 p-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-bg">
                                <Camera className="h-5 w-5 text-success" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-text-primary">Camera</p>
                                <p className="text-xs text-text-muted">Required for proctoring</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-md border border-border-subtle bg-surface-2 p-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-bg">
                                <Mic className="h-5 w-5 text-success" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-text-primary">Microphone</p>
                                <p className="text-xs text-text-muted">Required for proctoring</p>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* Consent */}
                <GlassCard static className="mb-6 p-6">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-border accent-accent"
                        />
                        <span className="text-sm leading-relaxed text-text-secondary">
                            I have read and understood all the rules. I consent to proctoring via webcam and screen monitoring.
                            I understand that violations will result in automatic termination of my assessment.
                        </span>
                    </label>
                </GlassCard>

                {error && (
                    <div className="mb-4 flex items-center gap-3 rounded-md border border-danger/20 bg-danger-bg p-4">
                        <AlertCircle className="h-5 w-5 flex-shrink-0 text-danger" />
                        <p className="text-sm text-danger">{error}</p>
                    </div>
                )}

                <div className="flex justify-end">
                    <GlassButton
                        variant="primary"
                        size="lg"
                        disabled={!consent || starting}
                        onClick={handleStart}
                        isLoading={starting}
                    >
                        Begin Assessment
                        <ArrowRight className="h-4 w-4" />
                    </GlassButton>
                </div>
            </div>
        </div>
    );
}
