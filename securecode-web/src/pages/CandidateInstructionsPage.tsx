import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assessmentApi } from '@/lib/assessment-api';
import { GlassCard, GlassButton } from '@/components/ui';
import { toast } from '@/components/ui/toast/useToastStore';

const RULES = [
    'You must remain on the test tab for the entire duration. Switching tabs will be flagged.',
    'Your webcam must stay on. Your face must be visible and centered at all times.',
    'Only one person should be visible in the camera frame.',
    'No external resources, notes, or communication tools are allowed.',
    'The test has three sections: Aptitude, Reasoning, and Coding — each with a time limit.',
    'You cannot pause or restart the assessment once it begins.',
    'Three proctoring warnings for face detection issues will terminate your test.',
    'Two tab-switch warnings will terminate your test.',
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
            <div className="mx-auto max-w-2xl px-6 py-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-semibold text-text-primary">Fresher Hiring Assessment</h1>
                    <p className="mt-2 text-base text-text-secondary">
                        Before you begin, please review the rules and give your consent.
                    </p>
                </div>

                <GlassCard className="mb-6 p-6">
                    <h2 className="mb-4 text-lg font-semibold text-text-primary">Test Rules</h2>
                    <ul className="space-y-3">
                        {RULES.map((rule, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-medium text-text-secondary">
                                    {i + 1}
                                </span>
                                <span className="text-sm text-text-secondary">{rule}</span>
                            </li>
                        ))}
                    </ul>
                </GlassCard>

                <GlassCard className="mb-6 p-6">
                    <h2 className="mb-4 text-lg font-semibold text-text-primary">System Check</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 rounded-md border border-border-subtle bg-surface-2 p-4">
                            <div className="h-2 w-2 rounded-full bg-success" />
                            <div>
                                <p className="text-sm font-medium text-text-primary">Camera</p>
                                <p className="text-xs text-text-muted">Required for proctoring</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-md border border-border-subtle bg-surface-2 p-4">
                            <div className="h-2 w-2 rounded-full bg-success" />
                            <div>
                                <p className="text-sm font-medium text-text-primary">Microphone</p>
                                <p className="text-xs text-text-muted">Required for proctoring</p>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="mb-6 p-6">
                    <label className="flex items-start gap-3">
                        <input
                            type="checkbox"
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-border accent-accent"
                        />
                        <span className="text-sm text-text-secondary">
                            I have read and understood all the rules. I consent to proctoring via webcam and screen monitoring.
                            I understand that violations will result in automatic termination of my assessment.
                        </span>
                    </label>
                </GlassCard>

                {error && (
                    <div className="mb-4 rounded-md border border-danger/20 bg-danger-bg p-4">
                        <p className="text-sm text-danger">{error}</p>
                    </div>
                )}

                <div className="flex justify-end">
                    <GlassButton
                        variant="primary"
                        size="lg"
                        disabled={!consent || starting}
                        onClick={handleStart}
                    >
                        {starting ? 'Starting...' : 'Begin Assessment'}
                    </GlassButton>
                </div>
            </div>
        </div>
    );
}
