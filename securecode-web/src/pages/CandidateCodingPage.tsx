import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assessmentApi, type QuestionDTO } from '@/lib/assessment-api';
import { GlassCard, GlassButton, GlassBadge } from '@/components/ui';
import { toast } from '@/components/ui/toast/useToastStore';

const SECTIONS = ['aptitude', 'reasoning', 'coding'] as const;
type Section = typeof SECTIONS[number];

const SECTION_DURATIONS: Record<Section, number> = {
    aptitude: 15 * 60,
    reasoning: 15 * 60,
    coding: 45 * 60,
};

const SECTION_LABELS: Record<Section, string> = {
    aptitude: 'Aptitude',
    reasoning: 'Reasoning',
    coding: 'Coding',
};

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function CandidateCodingPage() {
    const { sessionId, section } = useParams<{ sessionId: string; section: string }>();
    const navigate = useNavigate();
    const currentSection = (section as Section) ?? 'aptitude';
    const [questions, setQuestions] = useState<QuestionDTO[]>([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [code, setCode] = useState('');
    const [language, setLanguage] = useState('python');
    const [timeLeft, setTimeLeft] = useState(SECTION_DURATIONS[currentSection] ?? 900);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [proctorWarnings, setProctorWarnings] = useState(0);
    const [showProctorPreview, setShowProctorPreview] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const answersRef = useRef<Record<string, string>>({});
    const tabSwitchCount = useRef(0);

    answersRef.current = answers;

    // Keep answers ref in sync
    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    // Load questions for the section
    useEffect(() => {
        const orgId = localStorage.getItem('securecode_org_id') ?? '';
        if (!orgId) {
            setLoading(false);
            return;
        }
        assessmentApi.listQuestions(orgId, currentSection).then((qs) => {
            setQuestions(qs);
            setLoading(false);
        }).catch(() => {
            setLoading(false);
        });
    }, [currentSection]);

    // Timer
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSectionSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [currentSection]);

    // Camera proctoring
    useEffect(() => {
        let mounted = true;
        async function startCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                if (!mounted) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch {
                toast.warning('Camera access denied. Proctoring may flag your session.');
            }
        }
        startCamera();
        return () => {
            mounted = false;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    // Tab switch detection
    useEffect(() => {
        const handleVisibility = async () => {
            if (document.hidden && sessionId) {
                tabSwitchCount.current += 1;
                try {
                    await assessmentApi.recordProctoringEvent(sessionId, 'tab_switch');
                } catch { /* ignore */ }
                setProctorWarnings(prev => prev + 1);
                toast.danger(`Tab switch warning ${tabSwitchCount.current}/2. One more will terminate your test.`);
                if (tabSwitchCount.current >= 2) {
                    toast.danger('Test terminated: Too many tab switches.');
                    navigate(`/test/${sessionId}/terminated`);
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [sessionId, navigate]);

    const handleAnswerSelect = useCallback((questionId: string, option: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: option }));
    }, []);

    const handleSectionSubmit = useCallback(async () => {
        if (!sessionId) return;
        setSubmitting(true);

        try {
            if (currentSection === 'coding') {
                const codingQ = questions[currentQ];
                if (codingQ && code.trim()) {
                    await assessmentApi.submitCode(sessionId, codingQ.id, language, code);
                }
                await assessmentApi.submitTest(sessionId);
                toast.success('Test submitted successfully!');
                navigate(`/test/${sessionId}/complete`);
                return;
            }

            // Submit all MCQ answers
            for (const q of questions) {
                const selected = answersRef.current[q.id];
                if (selected) {
                    await assessmentApi.submitAnswer(sessionId, q.id, selected);
                }
            }

            const nextSectionIndex = SECTIONS.indexOf(currentSection) + 1;
            if (nextSectionIndex < SECTIONS.length) {
                const nextSection = SECTIONS[nextSectionIndex];
                navigate(`/test/${sessionId}/${nextSection}`);
                toast.success(`${SECTION_LABELS[currentSection]} section submitted!`);
            } else {
                await assessmentApi.submitTest(sessionId);
                toast.success('Test submitted successfully!');
                navigate(`/test/${sessionId}/complete`);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to submit section';
            toast.danger(message);
        } finally {
            setSubmitting(false);
        }
    }, [sessionId, currentSection, questions, currentQ, code, language, navigate]);

    const handleCodeSubmit = async () => {
        if (!sessionId) return;
        const codingQ = questions[currentQ];
        if (!codingQ || !code.trim()) return;
        try {
            await assessmentApi.submitCode(sessionId, codingQ.id, language, code);
            toast.success('Code submitted');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to submit code';
            toast.danger(message);
        }
    };

    const sectionIndex = SECTIONS.indexOf(currentSection);
    const isCoding = currentSection === 'coding';

    return (
        <div className="flex h-screen flex-col bg-canvas">
            {/* Top Bar */}
            <header className="flex h-14 items-center justify-between border-b border-border-subtle bg-surface px-6">
                <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-text-primary">SecureCode AI</span>
                    <div className="flex items-center gap-2">
                        {SECTIONS.map((s, i) => (
                            <div key={s} className="flex items-center gap-2">
                                <span
                                    className={`text-xs font-medium ${
                                        i === sectionIndex
                                            ? 'text-accent'
                                            : i < sectionIndex
                                            ? 'text-success'
                                            : 'text-text-muted'
                                    }`}
                                >
                                    {SECTION_LABELS[s]}
                                </span>
                                {i < SECTIONS.length - 1 && (
                                    <span className="text-text-muted">/</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {proctorWarnings > 0 && (
                        <GlassBadge tone="warning">
                            {proctorWarnings} warning{proctorWarnings !== 1 ? 's' : ''}
                        </GlassBadge>
                    )}
                    <div className={`flex items-center gap-2 ${timeLeft < 60 ? 'text-danger' : 'text-text-secondary'}`}>
                        <span className="text-sm font-medium">{formatTime(timeLeft)}</span>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="py-12 text-center text-text-muted">Loading questions...</div>
                    ) : questions.length === 0 ? (
                        <div className="py-12 text-center text-text-muted">No questions available for this section.</div>
                    ) : isCoding ? (
                        <CodingView
                            question={questions[currentQ]}
                            code={code}
                            setCode={setCode}
                            language={language}
                            setLanguage={setLanguage}
                            onSubmit={handleCodeSubmit}
                            questionIndex={currentQ}
                            totalQuestions={questions.length}
                            onPrev={() => setCurrentQ(prev => Math.max(0, prev - 1))}
                            onNext={() => setCurrentQ(prev => Math.min(questions.length - 1, prev + 1))}
                        />
                    ) : (
                        <MCQView
                            question={questions[currentQ]}
                            selectedAnswer={answers[questions[currentQ]?.id]}
                            onSelect={(option) => handleAnswerSelect(questions[currentQ].id, option)}
                            questionIndex={currentQ}
                            totalQuestions={questions.length}
                            onPrev={() => setCurrentQ(prev => Math.max(0, prev - 1))}
                            onNext={() => setCurrentQ(prev => Math.min(questions.length - 1, prev + 1))}
                        />
                    )}
                </main>

                {/* Proctoring Sidebar */}
                <aside className="flex w-64 flex-col border-l border-border-subtle bg-surface">
                    <div className="border-b border-border-subtle p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Proctoring</p>
                    </div>
                    <div className="p-4">
                        <div className="relative overflow-hidden rounded-md border border-border-subtle bg-surface-2">
                            {showProctorPreview && videoRef && (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="h-36 w-full object-cover"
                                />
                            )}
                            {!showProctorPreview && (
                                <div className="flex h-36 items-center justify-center">
                                    <span className="text-xs text-text-muted">Camera off</span>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setShowProctorPreview(!showProctorPreview)}
                            className="mt-2 text-xs text-text-secondary hover:text-text-primary"
                        >
                            {showProctorPreview ? 'Hide preview' : 'Show preview'}
                        </button>
                    </div>
                    <div className="border-t border-border-subtle p-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-success" />
                                <span className="text-xs text-text-secondary">Camera active</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-success" />
                                <span className="text-xs text-text-secondary">Tab focus detected</span>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Bottom Action Bar */}
            <footer className="flex h-16 items-center justify-between border-t border-border-subtle bg-surface px-6">
                <div className="text-sm text-text-muted">
                    {questions.length > 0 && !loading && (
                        <>Question {currentQ + 1} of {questions.length}</>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {currentQ > 0 && !loading && questions.length > 0 && (
                        <GlassButton
                            variant="secondary"
                            onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
                        >
                            Previous
                        </GlassButton>
                    )}
                    {currentQ < questions.length - 1 && !loading && questions.length > 0 && (
                        <GlassButton
                            variant="secondary"
                            onClick={() => setCurrentQ(prev => Math.min(questions.length - 1, prev + 1))}
                        >
                            Next
                        </GlassButton>
                    )}
                    <GlassButton
                        variant="primary"
                        disabled={submitting || loading}
                        onClick={handleSectionSubmit}
                    >
                        {submitting
                            ? 'Submitting...'
                            : sectionIndex === SECTIONS.length - 1
                            ? 'Submit Test'
                            : 'Submit Section'}
                    </GlassButton>
                </div>
            </footer>
        </div>
    );
}

// ─── MCQ View ───

function MCQView({
    question,
    selectedAnswer,
    onSelect,
    questionIndex,
    totalQuestions,
    onPrev: _onPrev,
    onNext: _onNext,
}: {
    question: QuestionDTO;
    selectedAnswer?: string;
    onSelect: (option: string) => void;
    questionIndex: number;
    totalQuestions: number;
    onPrev: () => void;
    onNext: () => void;
}) {
    const options = [
        { key: 'A', text: question.optionA },
        { key: 'B', text: question.optionB },
        { key: 'C', text: question.optionC },
        { key: 'D', text: question.optionD },
    ].filter(o => o.text);

    return (
        <div className="mx-auto max-w-2xl">
            <div className="mb-6">
                <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                    Question {questionIndex + 1} / {totalQuestions}
                </span>
            </div>
            <GlassCard className="p-6">
                <p className="mb-6 text-base text-text-primary">{question.body}</p>
                <div className="space-y-3">
                    {options.map((opt) => (
                        <button
                            key={opt.key}
                            onClick={() => onSelect(opt.key)}
                            className={`flex w-full items-center gap-3 rounded-md border p-4 text-left transition-colors ${
                                selectedAnswer === opt.key
                                    ? 'border-accent bg-accent-light'
                                    : 'border-border-subtle bg-surface hover:bg-surface-hover'
                            }`}
                        >
                            <span
                                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                                    selectedAnswer === opt.key
                                        ? 'bg-accent text-accent-text'
                                        : 'bg-surface-2 text-text-secondary'
                                }`}
                            >
                                {opt.key}
                            </span>
                            <span className="text-sm text-text-primary">{opt.text}</span>
                        </button>
                    ))}
                </div>
            </GlassCard>
        </div>
    );
}

// ─── Coding View ───

function CodingView({
    question,
    code,
    setCode,
    language,
    setLanguage,
    onSubmit,
    questionIndex,
    totalQuestions,
    onPrev: _onPrev,
    onNext: _onNext,
}: {
    question: QuestionDTO;
    code: string;
    setCode: (code: string) => void;
    language: string;
    setLanguage: (lang: string) => void;
    onSubmit: () => void;
    questionIndex: number;
    totalQuestions: number;
    onPrev: () => void;
    onNext: () => void;
}) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = e.currentTarget.selectionStart;
            const end = e.currentTarget.selectionEnd;
            const newValue = code.substring(0, start) + '    ' + code.substring(end);
            setCode(newValue);
            requestAnimationFrame(() => {
                if (textareaRef.current) {
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
                }
            });
        }
    };

    return (
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
            <div className="mb-px">
                <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                    Coding Problem {questionIndex + 1} / {totalQuestions}
                </span>
            </div>
            <GlassCard className="p-6">
                <p className="mb-4 text-base text-text-primary">{question.body}</p>
                {question.testCases && (
                    <div className="rounded-md border border-border-subtle bg-surface-2 p-4">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Sample Test Cases</p>
                        <pre className="overflow-x-auto text-sm text-text-secondary">
                            <code>{question.testCases}</code>
                        </pre>
                    </div>
                )}
            </GlassCard>

            <div className="flex items-center justify-between">
                <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-primary focus:border-accent focus:outline-none"
                >
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="javascript">JavaScript</option>
                    <option value="cpp">C++</option>
                </select>
                <GlassButton variant="secondary" size="sm" onClick={onSubmit}>
                    Run & Submit
                </GlassButton>
            </div>

            <div className="overflow-hidden rounded-md border border-border-subtle">
                <div className="flex items-center justify-between border-b border-border-subtle bg-surface-2 px-4 py-2">
                    <span className="text-xs font-medium text-text-muted">editor — {language}</span>
                </div>
                <textarea
                    ref={textareaRef}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={handleKeyDown}
                    spellCheck={false}
                    className="h-80 w-full resize-none bg-surface p-4 font-mono text-sm text-text-primary focus:outline-none"
                    placeholder={`// Write your ${language} solution here...`}
                />
            </div>
        </div>
    );
}
