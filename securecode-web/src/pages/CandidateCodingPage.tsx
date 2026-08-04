import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assessmentApi, type QuestionDTO } from '@/lib/assessment-api';
import { GlassCard, GlassButton } from '@/components/ui';
import { toast } from '@/components/ui/toast/useToastStore';
import { useProctoring } from '@/hooks/useProctoring';
import { ShieldCheck, AlertTriangle, Camera, CameraOff, Mic, MicOff, Eye } from 'lucide-react';

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
    const [showProctorPreview, setShowProctorPreview] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);
    const answersRef = useRef<Record<string, string>>({});

    const proctoring = useProctoring({
        sessionId: sessionId ?? '',
        videoRef,
        enabled: !!sessionId,
        onTerminate: () => {
            navigate(`/test/${sessionId}/terminated`);
        },
    });

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
                    {proctoring.warnings > 0 && (
                        <div className="flex items-center gap-1.5 rounded-md bg-warning-bg px-2.5 py-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                            <span className="text-xs font-medium text-warning">{proctoring.warnings} warning{proctoring.warnings !== 1 ? 's' : ''}</span>
                        </div>
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
                <aside className="flex w-72 flex-col border-l border-border-subtle bg-surface">
                    <div className="flex items-center gap-2 border-b border-border-subtle p-4">
                        <ShieldCheck className="h-4 w-4 text-accent" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">AI Proctoring</p>
                    </div>

                    {/* Camera Feed */}
                    <div className="p-4">
                        <div className="relative overflow-hidden rounded-lg border border-border-subtle bg-surface-2">
                            {showProctorPreview && (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="h-40 w-full object-cover"
                                />
                            )}
                            {!showProctorPreview && (
                                <div className="flex h-40 flex-col items-center justify-center gap-2">
                                    <CameraOff className="h-6 w-6 text-text-muted" />
                                    <span className="text-xs text-text-muted">Camera hidden</span>
                                </div>
                            )}
                            {/* Face status overlay */}
                            {showProctorPreview && proctoring.cameraActive && (
                                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded bg-black/60 px-2 py-1">
                                    {proctoring.faceStatus === 'ok' && (
                                        <>
                                            <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                                            <span className="text-[10px] font-medium text-white">Face detected</span>
                                        </>
                                    )}
                                    {proctoring.faceStatus === 'no_face' && (
                                        <>
                                            <div className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                                            <span className="text-[10px] font-medium text-white">No face!</span>
                                        </>
                                    )}
                                    {proctoring.faceStatus === 'multi_face' && (
                                        <>
                                            <div className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
                                            <span className="text-[10px] font-medium text-white">Multiple faces!</span>
                                        </>
                                    )}
                                    {proctoring.faceStatus === 'loading' && (
                                        <>
                                            <div className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
                                            <span className="text-[10px] font-medium text-white">Loading AI...</span>
                                        </>
                                    )}
                                    {proctoring.faceStatus === 'camera_error' && (
                                        <>
                                            <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                            <span className="text-[10px] font-medium text-white">Camera error</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setShowProctorPreview(!showProctorPreview)}
                            className="mt-2 flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
                        >
                            {showProctorPreview ? <CameraOff className="h-3 w-3" /> : <Camera className="h-3 w-3" />}
                            {showProctorPreview ? 'Hide preview' : 'Show preview'}
                        </button>
                    </div>

                    {/* Status indicators */}
                    <div className="border-t border-border-subtle p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {proctoring.cameraActive ? (
                                    <Camera className="h-3.5 w-3.5 text-success" />
                                ) : (
                                    <CameraOff className="h-3.5 w-3.5 text-danger" />
                                )}
                                <span className="text-xs text-text-secondary">Camera</span>
                            </div>
                            <span className={`text-xs font-medium ${proctoring.cameraActive ? 'text-success' : 'text-danger'}`}>
                                {proctoring.cameraActive ? 'Active' : 'Off'}
                            </span>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {proctoring.audioRecording ? (
                                    <Mic className="h-3.5 w-3.5 text-success" />
                                ) : (
                                    <MicOff className="h-3.5 w-3.5 text-danger" />
                                )}
                                <span className="text-xs text-text-secondary">Microphone</span>
                            </div>
                            <span className={`text-xs font-medium ${proctoring.audioRecording ? 'text-success' : 'text-danger'}`}>
                                {proctoring.audioRecording ? 'Recording' : 'Off'}
                            </span>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Eye className="h-3.5 w-3.5 text-accent" />
                                <span className="text-xs text-text-secondary">Face detection</span>
                            </div>
                            <span className="text-xs font-medium text-text-secondary">
                                {proctoring.faceCount} face{proctoring.faceCount !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {proctoring.warnings > 0 && (
                            <div className="flex items-center gap-2 rounded-md bg-warning-bg p-2">
                                <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                                <span className="text-xs text-warning">{proctoring.warnings} total warning{proctoring.warnings !== 1 ? 's' : ''}</span>
                            </div>
                        )}
                    </div>

                    {/* Last screenshot thumbnail */}
                    {proctoring.lastScreenshot && (
                        <div className="border-t border-border-subtle p-4">
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Last snapshot</p>
                            <img
                                src={proctoring.lastScreenshot ?? undefined}
                                alt="Proctoring snapshot"
                                className="w-full rounded-md border border-border-subtle"
                            />
                        </div>
                    )}
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
