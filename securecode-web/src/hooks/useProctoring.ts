import { useState, useEffect, useRef, useCallback } from 'react';
import { assessmentApi } from '@/lib/assessment-api';
import { toast } from '@/components/ui/toast/useToastStore';

export type FaceStatus = 'loading' | 'ok' | 'no_face' | 'multi_face' | 'camera_error';

export interface ProctoringState {
    faceStatus: FaceStatus;
    faceCount: number;
    warnings: number;
    audioRecording: boolean;
    cameraActive: boolean;
    lastScreenshot: string | null;
}

interface UseProctoringOptions {
    sessionId: string;
    videoRef: React.RefObject<HTMLVideoElement>;
    enabled?: boolean;
    detectionIntervalMs?: number;
    screenshotIntervalMs?: number;
    onTerminate?: (reason: string) => void;
}

const MAX_FACE_WARNINGS = 3;
const MAX_TAB_WARNINGS = 2;

export function useProctoring({
    sessionId,
    videoRef,
    enabled = true,
    detectionIntervalMs = 3000,
    screenshotIntervalMs = 30000,
    onTerminate,
}: UseProctoringOptions) {
    const [state, setState] = useState<ProctoringState>({
        faceStatus: 'loading',
        faceCount: 0,
        warnings: 0,
        audioRecording: false,
        cameraActive: false,
        lastScreenshot: null,
    });

    const streamRef = useRef<MediaStream | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const faceDetectorRef = useRef<any>(null);
    const tfReadyRef = useRef(false);
    const tabSwitchCount = useRef(0);
    const faceWarningCount = useRef(0);
    const totalWarningsRef = useRef(0);
    const detectionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const screenshotTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const terminatedRef = useRef(false);

    const captureScreenshot = useCallback((): string | null => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return null;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(video, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.6);
    }, [videoRef]);

    const getAudioBase64 = useCallback(async (): Promise<string | null> => {
        if (!mediaRecorderRef.current || audioChunksRef.current.length === 0) return null;
        return new Promise((resolve) => {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
            audioChunksRef.current = [];
        });
    }, []);

    const sendEvent = useCallback(async (eventType: string, detail?: string) => {
        if (terminatedRef.current) return;
        const screenshot = captureScreenshot();
        const audio = await getAudioBase64();
        try {
            await assessmentApi.recordDetailedProctoringEvent(sessionId, {
                eventType,
                screenshotData: screenshot ?? undefined,
                audioData: audio ?? undefined,
                detail,
            });
        } catch {
            // Fallback to simple event
            try {
                await assessmentApi.recordProctoringEvent(sessionId, eventType);
            } catch { /* ignore */ }
        }
        if (screenshot) {
            setState(prev => ({ ...prev, lastScreenshot: screenshot }));
        }
    }, [sessionId, captureScreenshot, getAudioBase64]);

    const terminate = useCallback((reason: string) => {
        if (terminatedRef.current) return;
        terminatedRef.current = true;
        toast.danger(`Test terminated: ${reason}`);
        onTerminate?.(reason);
    }, [onTerminate]);

    // Initialize TensorFlow.js face detector
    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;

        async function initDetector() {
            try {
                const tf = await import('@tensorflow/tfjs-core');
                await import('@tensorflow/tfjs-backend-webgl');
                await import('@tensorflow/tfjs-converter');
                const faceDetection = await import('@tensorflow-models/face-detection');

                await tf.setBackend('webgl');
                await tf.ready();

                const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
                const detector = await faceDetection.createDetector(model, {
                    runtime: 'tfjs',
                    maxFaces: 5,
                });

                if (cancelled) return;
                faceDetectorRef.current = detector;
                tfReadyRef.current = true;
                setState(prev => ({ ...prev, faceStatus: 'ok' }));
            } catch (err) {
                console.warn('Face detection init failed, falling back to camera-only mode', err);
                tfReadyRef.current = false;
                setState(prev => ({ ...prev, faceStatus: 'ok' }));
            }
        }

        initDetector();
        return () => { cancelled = true; };
    }, [enabled]);

    // Start camera + audio
    useEffect(() => {
        if (!enabled) return;
        let mounted = true;

        async function startMedia() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480 },
                    audio: true,
                });
                if (!mounted) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setState(prev => ({ ...prev, cameraActive: true }));

                // Extract audio track for recording
                const audioTracks = stream.getAudioTracks();
                if (audioTracks.length > 0) {
                    try {
                        const audioStream = new MediaStream(audioTracks);
                        audioStreamRef.current = audioStream;
                        const recorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });
                        recorder.ondataavailable = (e) => {
                            if (e.data.size > 0) audioChunksRef.current.push(e.data);
                        };
                        recorder.start(10000); // collect 10s chunks
                        mediaRecorderRef.current = recorder;
                        setState(prev => ({ ...prev, audioRecording: true }));
                    } catch {
                        console.warn('Audio recording not supported');
                    }
                }
            } catch {
                setState(prev => ({ ...prev, faceStatus: 'camera_error', cameraActive: false }));
                toast.warning('Camera access denied. Proctoring will flag your session.');
            }
        }

        startMedia();

        return () => {
            mounted = false;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        };
    }, [enabled, videoRef]);

    // Face detection loop
    useEffect(() => {
        if (!enabled || !tfReadyRef.current) return;

        const detect = async () => {
            const video = videoRef.current;
            const detector = faceDetectorRef.current;
            if (!video || !detector || video.readyState < 2) return;

            try {
                const faces = await detector.estimateFaces(video, { flipHorizontal: false });
                const count = faces.length;

                setState(prev => ({
                    ...prev,
                    faceCount: count,
                    faceStatus: count === 1 ? 'ok' : count === 0 ? 'no_face' : 'multi_face',
                }));

                if (count === 0) {
                    faceWarningCount.current += 1;
                    totalWarningsRef.current += 1;
                    setState(prev => ({ ...prev, warnings: totalWarningsRef.current }));
                    toast.danger(`No face detected! Warning ${faceWarningCount.current}/${MAX_FACE_WARNINGS}`);
                    await sendEvent('face_lost', `No face detected (warning ${faceWarningCount.current})`);
                    if (faceWarningCount.current >= MAX_FACE_WARNINGS) {
                        terminate('Too many face detection violations');
                    }
                } else if (count > 1) {
                    faceWarningCount.current += 1;
                    totalWarningsRef.current += 1;
                    setState(prev => ({ ...prev, warnings: totalWarningsRef.current }));
                    toast.danger(`Multiple faces detected! Warning ${faceWarningCount.current}/${MAX_FACE_WARNINGS}`);
                    await sendEvent('multi_face', `${count} faces detected (warning ${faceWarningCount.current})`);
                    if (faceWarningCount.current >= MAX_FACE_WARNINGS) {
                        terminate('Too many face detection violations');
                    }
                }
            } catch {
                // Detection error, skip this cycle
            }
        };

        detectionTimerRef.current = setInterval(detect, detectionIntervalMs);
        return () => {
            if (detectionTimerRef.current) clearInterval(detectionTimerRef.current);
        };
    }, [enabled, detectionIntervalMs, sendEvent, terminate, videoRef]);

    // Periodic screenshot capture (even without violations)
    useEffect(() => {
        if (!enabled) return;

        const capture = async () => {
            if (terminatedRef.current) return;
            const screenshot = captureScreenshot();
            if (screenshot) {
                const audio = await getAudioBase64();
                try {
                    await assessmentApi.recordDetailedProctoringEvent(sessionId, {
                        eventType: 'periodic_snapshot',
                        screenshotData: screenshot,
                        audioData: audio ?? undefined,
                        detail: 'Routine proctoring snapshot',
                    });
                } catch { /* ignore */ }
                setState(prev => ({ ...prev, lastScreenshot: screenshot }));
            }
        };

        screenshotTimerRef.current = setInterval(capture, screenshotIntervalMs);
        return () => {
            if (screenshotTimerRef.current) clearInterval(screenshotTimerRef.current);
        };
    }, [enabled, screenshotIntervalMs, sessionId, captureScreenshot, getAudioBase64]);

    // Tab switch detection
    useEffect(() => {
        if (!enabled) return;

        const handleVisibility = async () => {
            if (document.hidden && !terminatedRef.current) {
                tabSwitchCount.current += 1;
                totalWarningsRef.current += 1;
                setState(prev => ({ ...prev, warnings: totalWarningsRef.current }));
                toast.danger(`Tab switch warning ${tabSwitchCount.current}/${MAX_TAB_WARNINGS}. One more will terminate your test.`);
                await sendEvent('tab_switch', `Tab switch detected (warning ${tabSwitchCount.current})`);
                if (tabSwitchCount.current >= MAX_TAB_WARNINGS) {
                    terminate('Too many tab switches');
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [enabled, sendEvent, terminate]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            if (detectionTimerRef.current) clearInterval(detectionTimerRef.current);
            if (screenshotTimerRef.current) clearInterval(screenshotTimerRef.current);
        };
    }, []);

    return state;
}
