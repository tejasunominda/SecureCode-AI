import { useState, useEffect, useRef, useCallback } from 'react';
import { assessmentApi } from '@/lib/assessment-api';
import { toast } from '@/components/ui/toast/useToastStore';
import { useSettingsStore } from '@/stores/useSettingsStore';

export interface AdvancedProctoringState {
  copyPasteAttempts: number;
  screenRecordingActive: boolean;
  audioLevel: number;
  browserLocked: boolean;
  fullscreenActive: boolean;
  rightClickAttempts: number;
  devToolsAttempts: number;
}

interface UseAdvancedProctoringOptions {
  sessionId: string;
  enabled?: boolean;
  onViolation?: (type: string, detail: string) => void;
}

export function useAdvancedProctoring({
  sessionId,
  enabled = true,
  onViolation,
}: UseAdvancedProctoringOptions) {
  const settings = useSettingsStore((s) => s.settings.proctoring);
  const [state, setState] = useState<AdvancedProctoringState>({
    copyPasteAttempts: 0,
    screenRecordingActive: false,
    audioLevel: 0,
    browserLocked: false,
    fullscreenActive: false,
    rightClickAttempts: 0,
    devToolsAttempts: 0,
  });

  const copyPasteRef = useRef(0);
  const rightClickRef = useRef(0);
  const devToolsRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioLevelTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const screenChunksRef = useRef<Blob[]>([]);

  const sendViolation = useCallback(async (type: string, detail: string) => {
    try {
      await assessmentApi.recordDetailedProctoringEvent(sessionId, { eventType: type, detail });
    } catch {
      try {
        await assessmentApi.recordProctoringEvent(sessionId, type);
      } catch { /* ignore */ }
    }
    onViolation?.(type, detail);
  }, [sessionId, onViolation]);

  // Copy-paste detection
  useEffect(() => {
    if (!enabled || !settings.enableCopyPasteDetection) return;
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      copyPasteRef.current += 1;
      setState((prev) => ({ ...prev, copyPasteAttempts: copyPasteRef.current }));
      toast.danger(`Copy attempt blocked! (${copyPasteRef.current})`);
      sendViolation('copy_attempt', `Copy blocked (${copyPasteRef.current})`);
    };
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      copyPasteRef.current += 1;
      setState((prev) => ({ ...prev, copyPasteAttempts: copyPasteRef.current }));
      toast.danger(`Paste attempt blocked! (${copyPasteRef.current})`);
      sendViolation('paste_attempt', `Paste blocked (${copyPasteRef.current})`);
    };
    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      copyPasteRef.current += 1;
      setState((prev) => ({ ...prev, copyPasteAttempts: copyPasteRef.current }));
      toast.danger(`Cut attempt blocked! (${copyPasteRef.current})`);
      sendViolation('cut_attempt', `Cut blocked (${copyPasteRef.current})`);
    };
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
    };
  }, [enabled, settings.enableCopyPasteDetection, sendViolation]);

  // Right-click detection
  useEffect(() => {
    if (!enabled) return;
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      rightClickRef.current += 1;
      setState((prev) => ({ ...prev, rightClickAttempts: rightClickRef.current }));
      toast.danger('Right-click is disabled during the assessment');
      sendViolation('right_click', `Right-click blocked (${rightClickRef.current})`);
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [enabled, sendViolation]);

  // DevTools detection (basic)
  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) ||
        (e.ctrlKey && (e.key === 'U' || e.key === 'u')) ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        devToolsRef.current += 1;
        setState((prev) => ({ ...prev, devToolsAttempts: devToolsRef.current }));
        toast.danger('Developer tools are disabled during the assessment');
        sendViolation('devtools_attempt', `DevTools shortcut blocked (${devToolsRef.current})`);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, sendViolation]);

  // Audio level monitoring
  useEffect(() => {
    if (!enabled || !settings.enableAudioMonitoring) return;
    let mounted = true;
    async function setupAudio() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return; }
        const ctx = new AudioContext();
        audioContextRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        audioLevelTimerRef.current = setInterval(() => {
          analyser.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setState((prev) => ({ ...prev, audioLevel: Math.round(avg) }));
        }, 500);
      } catch { /* audio monitoring not available */ }
    }
    setupAudio();
    return () => {
      mounted = false;
      if (audioLevelTimerRef.current) clearInterval(audioLevelTimerRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [enabled, settings.enableAudioMonitoring]);

  // Screen recording
  const startScreenRecording = useCallback(async () => {
    if (!enabled || !settings.enableScreenRecording) return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const mimeType = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : undefined;
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) screenChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(screenChunksRef.current, { type: 'video/webm' });
        try {
          assessmentApi.recordDetailedProctoringEvent(sessionId, {
            eventType: 'screen_recording_chunk',
            screenshotData: undefined,
            detail: `Screen recording chunk (${Math.round(blob.size / 1024)}KB)`,
          });
        } catch { /* ignore */ }
        screenChunksRef.current = [];
        setState((prev) => ({ ...prev, screenRecordingActive: false }));
      };
      recorder.start(30000);
      screenRecorderRef.current = recorder;
      setState((prev) => ({ ...prev, screenRecordingActive: true }));
    } catch { /* screen recording not available */ }
  }, [enabled, settings.enableScreenRecording, sessionId]);

  // Browser lockdown (fullscreen)
  const enableBrowserLockdown = useCallback(async () => {
    if (!enabled || !settings.enableBrowserLockdown) return;
    try {
      await document.documentElement.requestFullscreen();
      setState((prev) => ({ ...prev, browserLocked: true, fullscreenActive: true }));
    } catch { /* fullscreen not available */ }
  }, [enabled, settings.enableBrowserLockdown]);

  const disableBrowserLockdown = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
    setState((prev) => ({ ...prev, browserLocked: false, fullscreenActive: false }));
  }, []);

  // Fullscreen exit detection
  useEffect(() => {
    if (!enabled || !settings.enableBrowserLockdown) return;
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setState((prev) => ({ ...prev, fullscreenActive: false }));
        sendViolation('fullscreen_exit', 'Candidate exited fullscreen mode');
        toast.danger('Exiting fullscreen is flagged! Please return to fullscreen.');
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [enabled, settings.enableBrowserLockdown, sendViolation]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (screenRecorderRef.current && screenRecorderRef.current.state !== 'inactive') {
        screenRecorderRef.current.stop();
      }
      if (audioLevelTimerRef.current) clearInterval(audioLevelTimerRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return {
    ...state,
    startScreenRecording,
    enableBrowserLockdown,
    disableBrowserLockdown,
  };
}
