import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assessmentApi, type QuestionDTO } from '@/lib/assessment-api';
import { runCode as runCodeClient, type RunCodeResult } from '@/lib/code-runner';
import { toast } from '@/components/ui/toast/useToastStore';
import { useProctoring } from '@/hooks/useProctoring';
import { useAdvancedProctoring } from '@/hooks/useAdvancedProctoring';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useFullscreenEnforcer } from '@/hooks/useFullscreen';
import { CodeEditor } from '@/components/ui/CodeEditor';
import { networkQualityMonitor, type NetworkQualityMetrics } from '@/lib/network-quality';
import {
    ShieldCheck, AlertTriangle, Camera, CameraOff, Mic, MicOff, Eye, CheckCircle,
    ChevronLeft, ChevronRight, Clock, Play, Send, Code2, ListOrdered, Wifi, WifiOff,
} from 'lucide-react';

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
    const [showProctorSidebar, setShowProctorSidebar] = useState(true);
    const [showQuestionPalette, setShowQuestionPalette] = useState(false);
    const [netQuality, setNetQuality] = useState<NetworkQualityMetrics | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const answersRef = useRef<Record<string, string>>({});

    const autoSaveData = { code, language, answers, currentQ, currentSection };
    const autoSave = useAutoSave(
        autoSaveData,
        async (data) => {
            if (!sessionId) return;
            const key = `securecode_draft_${sessionId}`;
            localStorage.setItem(key, JSON.stringify(data));
            try {
                await assessmentApi.autoSave(sessionId, {
                    currentSection: data.currentSection,
                    currentQuestionIndex: data.currentQ,
                    code: data.code,
                    language: data.language,
                    answers: data.answers,
                });
            } catch {
                // Backend save failed silently — localStorage is the fallback
            }
        },
        { intervalMs: 15_000, enabled: !!sessionId }
    );

    // Restore draft on mount / section change
    useEffect(() => {
        if (!sessionId) return;
        const key = `securecode_draft_${sessionId}`;
        const localDraft = localStorage.getItem(key);
        const restoreDraft = (parsed: { code?: string; language?: string; answers?: Record<string, string>; currentQ?: number; currentSection?: string }) => {
            if (parsed.currentSection === currentSection) {
                if (parsed.code) setCode(parsed.code);
                if (parsed.language) setLanguage(parsed.language);
                if (parsed.answers) setAnswers(parsed.answers);
                if (typeof parsed.currentQ === 'number') setCurrentQ(parsed.currentQ);
                toast.info('Draft restored', 'Your previous progress was restored.');
            }
        };
        if (localDraft) {
            try {
                restoreDraft(JSON.parse(localDraft));
                return;
            } catch { /* fall through to backend */ }
        }
        // Try backend restore if no local draft
        assessmentApi.getAutoSave(sessionId).then((backend) => {
            if (backend && backend.currentSection === currentSection) {
                if (backend.code) setCode(backend.code);
                if (backend.language) setLanguage(backend.language);
                if (backend.answers) setAnswers(backend.answers);
                if (typeof backend.currentQuestionIndex === 'number') setCurrentQ(backend.currentQuestionIndex);
                toast.info('Draft restored', 'Your previous progress was restored from server.');
            }
        }).catch(() => { /* no draft available */ });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId, currentSection]);

    // Network quality monitoring (FR-SEC-ENV-05)
    useEffect(() => {
        if (!sessionId) return;
        const unsub = networkQualityMonitor.onMetrics(setNetQuality);
        networkQualityMonitor.start(15000);
        return () => {
            unsub();
            networkQualityMonitor.stop();
        };
    }, [sessionId]);

    const proctoring = useProctoring({
        sessionId: sessionId ?? '',
        videoRef,
        enabled: !!sessionId,
        onTerminate: () => {
            navigate(`/test/${sessionId}/terminated`);
        },
    });

    const advancedProctoring = useAdvancedProctoring({
        sessionId: sessionId ?? '',
        enabled: !!sessionId,
    });

    const fullscreen = useFullscreenEnforcer({
        enabled: !!sessionId,
        onExit: () => {
            if (sessionId) {
                toast.warning('Fullscreen exited', 'Please stay in fullscreen mode during the assessment.');
            }
        },
    });

    // Start screen recording and browser lockdown on mount if enabled
    useEffect(() => {
        if (!sessionId) return;
        advancedProctoring.startScreenRecording();
        advancedProctoring.enableBrowserLockdown();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]);

    answersRef.current = answers;

    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    useEffect(() => {
        setLoading(true);
        setCurrentQ(0);
        setCode('');
        setAnswers({});
        setTimeLeft(SECTION_DURATIONS[currentSection as Section] ?? 900);
        const orgId = localStorage.getItem('securecode_org_id') || '';
        assessmentApi.listQuestions(orgId, currentSection).then((qs) => {
            setQuestions(qs.slice(0, 3));
            setLoading(false);
        }).catch((err) => {
            console.error('Failed to load questions for', currentSection, err);
            setQuestions([]);
            setLoading(false);
        });
    }, [currentSection]);

    const submittedRef = useRef(false);

    // Reset submitted state when section changes (component reuses same instance)
    useEffect(() => {
        submittedRef.current = false;
    }, [currentSection]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (submittedRef.current) return;
            e.preventDefault();
            e.returnValue = 'Your test is in progress. Are you sure you want to leave?';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    // Idle timeout — auto-submit after 5 minutes of no user interaction
    useEffect(() => {
        if (submittedRef.current) return;
        let idleTimer: ReturnType<typeof setTimeout>;
        const resetIdle = () => {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                if (!submittedRef.current) {
                    toast.warning('Session expired', 'You have been inactive for too long. Auto-submitting your test.');
                    handleSectionSubmit();
                }
            }, 5 * 60 * 1000);
        };
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach(evt => window.addEventListener(evt, resetIdle));
        resetIdle();
        return () => {
            clearTimeout(idleTimer);
            events.forEach(evt => window.removeEventListener(evt, resetIdle));
        };
    }, [currentSection]);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [currentSection]);

    useEffect(() => {
        if (timeLeft === 0 && !submitting) {
            handleSectionSubmit();
        }
    }, [timeLeft, submitting]);

    const handleAnswerSelect = useCallback((questionId: string, option: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: option }));
    }, []);

    const handleSectionSubmit = useCallback(async () => {
        if (!sessionId) return;
        if (submittedRef.current) return;
        submittedRef.current = true;
        setSubmitting(true);
        try {
            if (currentSection === 'coding') {
                const safeQ = Math.min(currentQ, questions.length - 1);
                const codingQ = questions[safeQ];
                if (codingQ && code.trim()) {
                    await assessmentApi.submitCode(sessionId, codingQ.id, language, code);
                }
                await assessmentApi.submitTest(sessionId);
                toast.success('Test submitted successfully!');
                navigate(`/test/${sessionId}/complete`);
                return;
            }
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
        const safeQ = Math.min(currentQ, questions.length - 1);
        const codingQ = questions[safeQ];
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
    const answeredCount = questions.filter(q => answers[q.id]).length;
    const safeCurrentQ = Math.min(currentQ, questions.length - 1);
    const currentQuestion = questions[safeCurrentQ];

    return (
        <div className="flex h-screen flex-col bg-[#0a0a0a] text-gray-200">
            {/* ─── Top Bar ─── */}
            <header className="flex h-12 items-center justify-between border-b border-[#222] bg-[#0d0d0d] px-4">
                <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-white">SecureCode AI</span>
                    <div className="flex items-center gap-1">
                        {SECTIONS.map((s, i) => (
                            <button
                                key={s}
                                onClick={() => navigate(`/test/${sessionId}/${s}`)}
                                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                                    i === sectionIndex
                                        ? 'bg-[#2d2d2d] text-white'
                                        : i < sectionIndex
                                        ? 'text-green-500 hover:bg-[#1a1a1a]'
                                        : 'text-gray-500 hover:bg-[#1a1a1a]'
                                }`}
                            >
                                {SECTION_LABELS[s]}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {autoSave.isSaving && (
                        <span className="text-[10px] text-gray-500 animate-pulse">Saving...</span>
                    )}
                    {!autoSave.isSaving && autoSave.lastSavedAt && (
                        <span className="text-[10px] text-gray-600">Saved</span>
                    )}
                    {autoSave.error && (
                        <span className="text-[10px] text-red-500">Save failed</span>
                    )}
                    <div className={`flex items-center gap-1 rounded px-2 py-1 ${fullscreen.isFullscreen ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <span className={`text-[10px] font-medium ${fullscreen.isFullscreen ? 'text-green-400' : 'text-red-400'}`}>
                            {fullscreen.isFullscreen ? 'Fullscreen' : 'Not FS'}
                        </span>
                    </div>
                    {proctoring.warnings > 0 && (
                        <div className="flex items-center gap-1.5 rounded bg-yellow-500/10 px-2 py-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                            <span className="text-xs font-medium text-yellow-500">{proctoring.warnings}</span>
                        </div>
                    )}
                    <div className={`flex items-center gap-1.5 ${timeLeft < 60 ? 'text-red-500' : 'text-gray-400'}`}>
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-sm font-mono font-medium">{formatTime(timeLeft)}</span>
                    </div>
                    {netQuality && (
                        <div className={`flex items-center gap-1.5 rounded px-2 py-1 ${netQuality.online && netQuality.rttMs < 1000 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`} title={`RTT: ${netQuality.rttMs}ms | Jitter: ${netQuality.jitterMs}ms | Loss: ${netQuality.packetLossPercent}%`}>
                            {netQuality.online && netQuality.rttMs < 1000 ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                            <span className="text-xs font-medium">{netQuality.rttMs}ms</span>
                        </div>
                    )}
                    <button
                        onClick={() => setShowProctorSidebar(!showProctorSidebar)}
                        className="rounded p-1.5 text-gray-500 hover:bg-[#1a1a1a] hover:text-gray-300"
                        title="Toggle proctoring panel"
                    >
                        <ShieldCheck className="h-4 w-4" />
                    </button>
                </div>
            </header>

            {/* ─── Main Layout ─── */}
            <div className="flex flex-1 overflow-hidden">
                {/* Main Content Area */}
                <div className="flex flex-1 flex-col overflow-hidden">
                    {loading ? (
                        <div className="flex flex-1 items-center justify-center text-gray-500">Loading questions...</div>
                    ) : questions.length === 0 ? (
                        <div className="flex flex-1 items-center justify-center text-gray-500">No questions available for this section.</div>
                    ) : isCoding ? (
                        <CodingView
                            question={currentQuestion}
                            code={code}
                            setCode={setCode}
                            language={language}
                            setLanguage={setLanguage}
                            onSubmit={handleCodeSubmit}
                            sessionId={sessionId ?? ''}
                            questionIndex={safeCurrentQ}
                            totalQuestions={questions.length}
                            onPrev={() => setCurrentQ(prev => Math.max(0, prev - 1))}
                            onNext={() => setCurrentQ(prev => Math.min(questions.length - 1, prev + 1))}
                        />
                    ) : (
                        <MCQView
                            question={currentQuestion}
                            selectedAnswer={currentQuestion ? answers[currentQuestion.id] : undefined}
                            onSelect={(option) => currentQuestion && handleAnswerSelect(currentQuestion.id, option)}
                            questionIndex={safeCurrentQ}
                            totalQuestions={questions.length}
                            answeredCount={answeredCount}
                            questions={questions}
                            answers={answers}
                            currentQ={currentQ}
                            setCurrentQ={setCurrentQ}
                            showPalette={showQuestionPalette}
                            setShowPalette={setShowQuestionPalette}
                            onPrev={() => setCurrentQ(prev => Math.max(0, prev - 1))}
                            onNext={() => setCurrentQ(prev => Math.min(questions.length - 1, prev + 1))}
                        />
                    )}
                </div>

                {/* ─── Proctoring Sidebar ─── */}
                {showProctorSidebar && (
                    <aside className="flex w-64 flex-col border-l border-[#222] bg-[#0d0d0d]">
                        <div className="flex items-center justify-between border-b border-[#222] px-4 py-3">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-blue-500" />
                                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Proctoring</span>
                            </div>
                            <button
                                onClick={() => setShowProctorPreview(!showProctorPreview)}
                                className="text-gray-500 hover:text-gray-300"
                            >
                                {showProctorPreview ? <CameraOff className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
                            </button>
                        </div>

                        <div className="p-3">
                            <div className="relative overflow-hidden rounded-lg border border-[#222] bg-[#111]">
                                <video ref={videoRef} autoPlay muted playsInline 
                                    className={showProctorPreview ? "h-32 w-full object-cover" : "h-0 w-0 opacity-0 absolute"} 
                                />
                                {!showProctorPreview && (
                                    <div className="flex h-32 flex-col items-center justify-center gap-1">
                                        <CameraOff className="h-5 w-5 text-gray-600" />
                                        <span className="text-[10px] text-gray-600">Camera hidden</span>
                                    </div>
                                )}
                                {showProctorPreview && proctoring.cameraActive && (
                                    <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5">
                                        {proctoring.faceStatus === 'ok' && (
                                            <><div className="h-1.5 w-1.5 rounded-full bg-green-400" /><span className="text-[9px] text-white">Face detected</span></>
                                        )}
                                        {proctoring.faceStatus === 'no_face' && (
                                            <><div className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" /><span className="text-[9px] text-white">No face!</span></>
                                        )}
                                        {proctoring.faceStatus === 'multi_face' && (
                                            <><div className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" /><span className="text-[9px] text-white">Multi face!</span></>
                                        )}
                                        {proctoring.faceStatus === 'loading' && (
                                            <><div className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" /><span className="text-[9px] text-white">Loading AI...</span></>
                                        )}
                                        {proctoring.faceStatus === 'camera_error' && (
                                            <><div className="h-1.5 w-1.5 rounded-full bg-red-500" /><span className="text-[9px] text-white">Camera error</span></>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                            <div className={`flex items-center gap-1.5 rounded border px-2 py-1.5 ${proctoring.cameraActive ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                                {proctoring.cameraActive ? <Camera className="h-3 w-3 text-green-500" /> : <CameraOff className="h-3 w-3 text-red-500" />}
                                <span className="text-[10px] text-gray-400">{proctoring.cameraActive ? 'Active' : 'Off'}</span>
                            </div>
                            <div className={`flex items-center gap-1.5 rounded border px-2 py-1.5 ${proctoring.audioRecording ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                                {proctoring.audioRecording ? <Mic className="h-3 w-3 text-green-500" /> : <MicOff className="h-3 w-3 text-red-500" />}
                                <span className="text-[10px] text-gray-400">{proctoring.audioRecording ? 'Recording' : 'Off'}</span>
                            </div>
                        </div>

                        <div className="border-t border-[#222] px-3 py-2 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Eye className="h-3 w-3 text-blue-500" />
                                    <span className="text-[10px] text-gray-400">Faces</span>
                                </div>
                                <span className="text-[10px] font-medium text-gray-300">{proctoring.faceCount}</span>
                            </div>
                            {proctoring.warnings > 0 && (
                                <div className="flex items-center gap-1.5 rounded bg-yellow-500/10 px-2 py-1">
                                    <AlertTriangle className="h-3 w-3 text-yellow-500" />
                                    <span className="text-[10px] text-yellow-500">{proctoring.warnings} warning(s)</span>
                                </div>
                            )}
                        </div>

                        {/* Advanced proctoring status */}
                        <div className="border-t border-[#222] px-3 py-2 space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-gray-500">Screen Rec</span>
                                <span className={`text-[10px] font-medium ${advancedProctoring.screenRecordingActive ? 'text-green-400' : 'text-gray-600'}`}>
                                    {advancedProctoring.screenRecordingActive ? 'ON' : 'OFF'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-gray-500">Copy-Paste Blocks</span>
                                <span className={`text-[10px] font-medium ${advancedProctoring.copyPasteAttempts > 0 ? 'text-red-400' : 'text-gray-600'}`}>
                                    {advancedProctoring.copyPasteAttempts}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-gray-500">Lockdown</span>
                                <span className={`text-[10px] font-medium ${advancedProctoring.browserLocked ? 'text-green-400' : 'text-gray-600'}`}>
                                    {advancedProctoring.browserLocked ? 'Active' : 'Off'}
                                </span>
                            </div>
                            {advancedProctoring.rightClickAttempts > 0 && (
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-gray-500">Right-clicks</span>
                                    <span className="text-[10px] font-medium text-red-400">{advancedProctoring.rightClickAttempts}</span>
                                </div>
                            )}
                        </div>

                        {proctoring.lastScreenshot && (
                            <div className="border-t border-[#222] p-3">
                                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">Last snapshot</p>
                                <img src={proctoring.lastScreenshot ?? undefined} alt="snapshot" className="w-full rounded border border-[#222]" />
                            </div>
                        )}
                    </aside>
                )}
            </div>

            {/* ─── Bottom Action Bar ─── */}
            <footer className="flex h-12 items-center justify-between border-t border-[#222] bg-[#0d0d0d] px-4">
                <div className="flex items-center gap-3">
                    {!isCoding && (
                        <button
                            onClick={() => setShowQuestionPalette(!showQuestionPalette)}
                            className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs text-gray-400 hover:bg-[#1a1a1a] hover:text-gray-200"
                        >
                            <ListOrdered className="h-3.5 w-3.5" />
                            Question Palette
                        </button>
                    )}
                    <span className="text-xs text-gray-500">
                        {questions.length > 0 && !loading && (
                            <>Q{safeCurrentQ + 1}/{questions.length} • {answeredCount} answered</>
                        )}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {safeCurrentQ > 0 && !loading && questions.length > 0 && (
                        <button
                            onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
                            className="flex items-center gap-1 rounded border border-[#333] px-3 py-1.5 text-xs text-gray-300 hover:bg-[#1a1a1a]"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" /> Prev
                        </button>
                    )}
                    {safeCurrentQ < questions.length - 1 && !loading && questions.length > 0 && (
                        <button
                            onClick={() => setCurrentQ(prev => Math.min(questions.length - 1, prev + 1))}
                            className="flex items-center gap-1 rounded border border-[#333] px-3 py-1.5 text-xs text-gray-300 hover:bg-[#1a1a1a]"
                        >
                            Next <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <button
                        disabled={submitting || loading}
                        onClick={handleSectionSubmit}
                        className="flex items-center gap-1.5 rounded bg-green-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                        <Send className="h-3.5 w-3.5" />
                        {submitting ? 'Submitting...' : sectionIndex === SECTIONS.length - 1 ? 'Submit Test' : 'Submit Section'}
                    </button>
                </div>
            </footer>
        </div>
    );
}

// ─── Question Palette (TCS NQT style) ───

function QuestionPalette({
    questions,
    answers,
    currentQ,
    setCurrentQ,
    showPalette,
}: {
    questions: QuestionDTO[];
    answers: Record<string, string>;
    currentQ: number;
    setCurrentQ: (fn: (prev: number) => number) => void;
    showPalette: boolean;
}) {
    if (!showPalette) return null;
    return (
        <div className="absolute right-4 top-12 z-50 w-64 rounded-lg border border-[#333] bg-[#1a1a1a] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Question Palette</span>
                <span className="text-[10px] text-gray-500">{questions.filter(q => answers[q.id]).length}/{questions.length} answered</span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
                {questions.map((q, i) => {
                    const isAnswered = !!answers[q.id];
                    const isCurrent = i === currentQ;
                    return (
                        <button
                            key={q.id}
                            onClick={() => setCurrentQ(() => i)}
                            className={`flex h-8 w-8 items-center justify-center rounded text-xs font-medium transition-colors ${
                                isCurrent
                                    ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                                    : isAnswered
                                    ? 'bg-green-600/80 text-white hover:bg-green-600'
                                    : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]'
                            }`}
                        >
                            {i + 1}
                        </button>
                    );
                })}
            </div>
            <div className="mt-3 space-y-1.5 border-t border-[#333] pt-3">
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-green-600/80" /><span className="text-[10px] text-gray-400">Answered</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-[#2a2a2a]" /><span className="text-[10px] text-gray-400">Not Answered</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-blue-600 ring-1 ring-blue-400" /><span className="text-[10px] text-gray-400">Current</span>
                </div>
            </div>
        </div>
    );
}

// ─── MCQ View (TCS NQT style) ───

function MCQView({
    question,
    selectedAnswer,
    onSelect,
    questionIndex,
    totalQuestions,
    answeredCount: _answeredCount,
    questions,
    answers,
    currentQ,
    setCurrentQ,
    showPalette,
    setShowPalette,
    onPrev: _onPrev,
    onNext: _onNext,
}: {
    question: QuestionDTO;
    selectedAnswer?: string;
    onSelect: (option: string) => void;
    questionIndex: number;
    totalQuestions: number;
    answeredCount: number;
    questions: QuestionDTO[];
    answers: Record<string, string>;
    currentQ: number;
    setCurrentQ: (fn: (prev: number) => number) => void;
    showPalette: boolean;
    setShowPalette: (v: boolean) => void;
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
        <div className="relative flex flex-1 overflow-hidden bg-[#0a0a0a]">
            <div className="mx-auto w-full max-w-3xl overflow-y-auto p-6">
                <QuestionPalette
                    questions={questions}
                    answers={answers}
                    currentQ={currentQ}
                    setCurrentQ={setCurrentQ}
                    showPalette={showPalette}
                />
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded bg-[#1a1a1a] text-sm font-bold text-blue-400">
                            {questionIndex + 1}
                        </span>
                        <span className="text-xs text-gray-500">of {totalQuestions} questions</span>
                    </div>
                    {question.difficulty && (
                        <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                            question.difficulty === 'easy' ? 'bg-green-500/10 text-green-400' :
                            question.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                            'bg-red-500/10 text-red-400'
                        }`}>
                            {question.difficulty}
                        </span>
                    )}
                </div>

                <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-6">
                    <p className="mb-6 text-[15px] leading-relaxed text-gray-200">{question.body}</p>
                    <div className="space-y-2.5">
                        {options.map((opt) => (
                            <button
                                key={opt.key}
                                onClick={() => onSelect(opt.key)}
                                className={`flex w-full items-center gap-3 rounded-lg border p-3.5 text-left transition-all ${
                                    selectedAnswer === opt.key
                                        ? 'border-blue-500 bg-blue-500/10'
                                        : 'border-[#222] bg-[#111] hover:border-[#333] hover:bg-[#161616]'
                                }`}
                            >
                                <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                    selectedAnswer === opt.key
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-[#222] text-gray-400'
                                }`}>
                                    {opt.key}
                                </span>
                                <span className="text-sm text-gray-200">{opt.text}</span>
                                {selectedAnswer === opt.key && (
                                    <CheckCircle className="ml-auto h-4 w-4 text-blue-500" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <button
                        onClick={() => setShowPalette(!showPalette)}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300"
                    >
                        <ListOrdered className="h-3.5 w-3.5" /> Toggle Palette
                    </button>
                    <span className="text-[10px] text-gray-600">
                        {selectedAnswer ? 'Answer saved' : 'Not answered yet'}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ─── Coding View (LeetCode split panel style) ───

function CodingView({
    question,
    code,
    setCode,
    language,
    setLanguage,
    onSubmit: _onSubmit,
    sessionId,
    questionIndex,
    totalQuestions,
    onPrev: _onPrev,
    onNext,
}: {
    question: QuestionDTO;
    code: string;
    setCode: (code: string) => void;
    language: string;
    setLanguage: (lang: string) => void;
    onSubmit: () => void;
    sessionId: string;
    questionIndex: number;
    totalQuestions: number;
    onPrev: () => void;
    onNext: () => void;
}) {
    const [running, setRunning] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [runResult, setRunResult] = useState<RunCodeResult | null>(null);
    const [phase, setPhase] = useState<'editing' | 'ran' | 'submitted'>('editing');
    const [activeTab, setActiveTab] = useState<'problem' | 'results'>('problem');
    const [splitRatio, setSplitRatio] = useState(0.45);
    const containerRef = useRef<HTMLDivElement>(null);
    const draggingRef = useRef(false);

    const handleRun = async () => {
        if (!code.trim()) return;
        if (language !== 'javascript' && language !== 'python') {
            toast.warning(`${language} is not supported in the browser. Please use JavaScript or Python.`);
            return;
        }
        setRunning(true);
        setRunResult(null);
        setActiveTab('results');
        try {
            const result = await runCodeClient(question.testCases, question.hiddenTestCases, code, language);
            setRunResult(result);
            setPhase('ran');
            if (result.allVisiblePassed) {
                toast.success('All sample test cases passed! You can now submit.');
            } else if (result.visibleTotal === 0) {
                toast.warning('No sample test cases. Try submitting directly.');
            } else {
                toast.warning(`${result.visiblePassed}/${result.visibleTotal} sample tests passed.`);
            }
        } catch (err) {
            toast.danger(err instanceof Error ? err.message : 'Failed to run code');
        } finally {
            setRunning(false);
        }
    };

    const handleSubmitCode = async () => {
        if (!code.trim() || !sessionId) return;
        if (language !== 'javascript' && language !== 'python') {
            toast.warning(`${language} is not supported in the browser. Please use JavaScript or Python.`);
            return;
        }
        setSubmitting(true);
        setActiveTab('results');
        try {
            const result = await runCodeClient(question.testCases, question.hiddenTestCases, code, language);
            setRunResult(result);
            if (result.allHiddenPassed) {
                await assessmentApi.submitCode(sessionId, question.id, language, code);
                toast.success('All tests passed! Code submitted.');
                setPhase('submitted');
            } else {
                toast.danger(`${result.hiddenPassed}/${result.hiddenTotal} hidden tests passed.`);
                setPhase('ran');
            }
        } catch (err) {
            toast.danger(err instanceof Error ? err.message : 'Failed to submit code');
        } finally {
            setSubmitting(false);
        }
    };

    const handleMouseDown = () => { draggingRef.current = true; };
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!draggingRef.current || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const ratio = Math.max(0.2, Math.min(0.7, (e.clientX - rect.left) / rect.width));
            setSplitRatio(ratio);
        };
        const handleMouseUp = () => { draggingRef.current = false; };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#222] bg-[#0d0d0d] px-4 py-2">
                <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-blue-400" />
                    <span className="text-xs font-medium text-gray-300">
                        Problem {questionIndex + 1} / {totalQuestions}
                    </span>
                    {question.difficulty && (
                        <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                            question.difficulty === 'easy' ? 'bg-green-500/10 text-green-400' :
                            question.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                            'bg-red-500/10 text-red-400'
                        }`}>
                            {question.difficulty}
                        </span>
                    )}
                </div>
            </div>

            <div ref={containerRef} className="flex flex-1 overflow-hidden">
                <div style={{ width: `${splitRatio * 100}%` }} className="flex flex-col overflow-hidden border-r border-[#222]">
                    <div className="flex items-center gap-1 border-b border-[#222] bg-[#0d0d0d] px-3">
                        <button
                            onClick={() => setActiveTab('problem')}
                            className={`px-3 py-2 text-xs font-medium ${activeTab === 'problem' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Description
                        </button>
                        <button
                            onClick={() => setActiveTab('results')}
                            className={`px-3 py-2 text-xs font-medium ${activeTab === 'results' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Test Results {runResult && `(${runResult.visiblePassed + runResult.hiddenPassed}/${runResult.visibleTotal + runResult.hiddenTotal})`}
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        {activeTab === 'problem' ? (
                            <div className="space-y-4">
                                <p className="text-sm leading-relaxed text-gray-200">{question.body}</p>
                                {question.testCases && (
                                    <div className="rounded-lg border border-[#222] bg-[#111] p-4">
                                        <div className="mb-2 flex items-center justify-between">
                                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Sample Test Cases</p>
                                            <span className="text-[10px] text-gray-600">{question.testCases.split('\n').filter(t => t.trim()).length} cases</span>
                                        </div>
                                        <pre className="overflow-x-auto text-xs text-gray-300">
                                            <code>{question.testCases}</code>
                                        </pre>
                                    </div>
                                )}
                                {question.hiddenTestCases && (
                                    <div className="rounded-lg border border-[#222] bg-[#111] p-4">
                                        <div className="mb-2 flex items-center justify-between">
                                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Hidden Test Cases</p>
                                            <span className="text-[10px] text-gray-600">{question.hiddenTestCases.split('\n').filter(t => t.trim()).length} cases</span>
                                        </div>
                                        <p className="text-[11px] text-gray-600">Hidden test cases are used to evaluate your submission. They are not visible to you.</p>
                                    </div>
                                )}
                                {question.tags && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {question.tags.split(',').map(tag => (
                                            <span key={tag} className="rounded bg-[#1a1a1a] px-2 py-0.5 text-[10px] text-gray-400">
                                                {tag.trim()}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <TestResults runResult={runResult} phase={phase} />
                        )}
                    </div>
                </div>

                <div
                    onMouseDown={handleMouseDown}
                    className="flex w-1 cursor-col-resize items-center bg-[#222] hover:bg-blue-500/50"
                />

                <div style={{ width: `${(1 - splitRatio) * 100}%` }} className="flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between border-b border-[#222] bg-[#0d0d0d] px-3 py-1.5">
                        <select
                            value={language}
                            onChange={(e) => { setLanguage(e.target.value); setPhase('editing'); setRunResult(null); }}
                            className="h-7 rounded border border-[#333] bg-[#1a1a1a] px-2 text-xs text-gray-200 focus:outline-none"
                        >
                            <option value="javascript">JavaScript</option>
                            <option value="python">Python</option>
                            <option value="java">Java</option>
                            <option value="cpp">C++</option>
                            <option value="c">C</option>
                            <option value="sql">SQL</option>
                        </select>
                        <span className="text-[10px] text-gray-600">
                            {language === 'javascript' || language === 'python' ? 'Define solution()' : 'Write solution'}
                        </span>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <CodeEditor
                            value={code}
                            onChange={(val) => { setCode(val); setPhase('editing'); }}
                            language={language}
                        />
                    </div>

                    <div className="flex items-center justify-between border-t border-[#222] bg-[#0d0d0d] px-3 py-2">
                        <div className="flex items-center gap-2">
                            {phase === 'submitted' && (
                                <span className="flex items-center gap-1 text-xs text-green-400">
                                    <CheckCircle className="h-3.5 w-3.5" /> Accepted
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleRun}
                                disabled={running || !code.trim()}
                                className="flex items-center gap-1.5 rounded border border-[#333] px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-[#1a1a1a] disabled:opacity-40"
                            >
                                <Play className="h-3.5 w-3.5" />
                                {running ? 'Running...' : 'Run'}
                            </button>
                            {phase === 'ran' && runResult?.allVisiblePassed && (
                                <button
                                    onClick={handleSubmitCode}
                                    disabled={submitting}
                                    className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    <Send className="h-3.5 w-3.5" />
                                    {submitting ? 'Submitting...' : 'Submit'}
                                </button>
                            )}
                            {phase === 'submitted' && questionIndex < totalQuestions - 1 && (
                                <button
                                    onClick={onNext}
                                    className="flex items-center gap-1.5 rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                                >
                                    Next <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {runResult && activeTab !== 'results' && (
                <div className="h-32 overflow-y-auto border-t border-[#222] bg-[#0d0d0d] p-3">
                    <TestResults runResult={runResult} phase={phase} compact />
                </div>
            )}
        </div>
    );
}

// ─── Test Results Component ───

function TestResults({ runResult, phase, compact }: { runResult: RunCodeResult | null; phase: string; compact?: boolean }) {
    if (!runResult) {
        return <p className="text-xs text-gray-500">Click &quot;Run&quot; to test your code.</p>;
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-[#111] p-2.5">
                <div className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium ${runResult.allVisiblePassed ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    <span>Sample: {runResult.visiblePassed}/{runResult.visibleTotal}</span>
                </div>
                {runResult.hiddenTotal > 0 && (
                    <div className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium ${runResult.allHiddenPassed ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        <span>Hidden: {runResult.hiddenPassed}/{runResult.hiddenTotal}</span>
                    </div>
                )}
                {phase === 'submitted' && runResult.allHiddenPassed && (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle className="h-3.5 w-3.5" /> All Passed!
                    </span>
                )}
            </div>

            {!compact && runResult.visibleResults.length > 0 && (
                <div>
                    <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-gray-500">Sample Test Cases</p>
                    <div className="space-y-1.5">
                        {runResult.visibleResults.map((tc, i) => (
                            <div key={i} className={`rounded border p-2.5 ${tc.passed ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-medium ${tc.passed ? 'text-green-400' : 'text-red-400'}`}>
                                        {tc.passed ? '✓' : '✗'} Case {i + 1}
                                    </span>
                                </div>
                                <div className="mt-1.5 space-y-0.5 text-[11px]">
                                    <div><span className="text-gray-500">Input: </span><code className="text-gray-300">{tc.input}</code></div>
                                    <div><span className="text-gray-500">Expected: </span><code className="text-gray-300">{tc.expectedOutput}</code></div>
                                    <div><span className="text-gray-500">Output: </span><code className={tc.passed ? 'text-green-400' : 'text-red-400'}>{tc.actualOutput}</code></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!compact && (phase === 'ran' || phase === 'submitted') && runResult.hiddenTotal > 0 && (
                <div>
                    <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-gray-500">Hidden Test Cases</p>
                    <div className="space-y-1.5">
                        {runResult.hiddenResults.map((tc, i) => (
                            <div key={i} className={`rounded border p-2.5 ${tc.passed ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-medium ${tc.passed ? 'text-green-400' : 'text-red-400'}`}>
                                        {tc.passed ? '✓' : '✗'} Hidden {i + 1}
                                    </span>
                                </div>
                                {!tc.passed && (
                                    <div className="mt-1.5 space-y-0.5 text-[11px]">
                                        <div><span className="text-gray-500">Expected: </span><code className="text-gray-300">{tc.expectedOutput}</code></div>
                                        <div><span className="text-gray-500">Got: </span><code className="text-red-400">{tc.actualOutput}</code></div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {compact && (
                <div className="space-y-1">
                    {runResult.visibleResults.map((tc, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px]">
                            <span className={tc.passed ? 'text-green-400' : 'text-red-400'}>{tc.passed ? '✓' : '✗'}</span>
                            <span className="text-gray-500">Case {i + 1}:</span>
                            <code className="text-gray-300">{tc.input}</code>
                            <span className="text-gray-600">→</span>
                            <code className={tc.passed ? 'text-green-400' : 'text-red-400'}>{tc.actualOutput}</code>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
