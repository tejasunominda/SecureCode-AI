import { useRef, useEffect, useCallback, useState } from 'react';

interface AutoSaveOptions {
    intervalMs?: number;
    enabled?: boolean;
}

interface AutoSaveState {
    lastSavedAt: Date | null;
    isSaving: boolean;
    error: string | null;
}

export function useAutoSave<T>(
    data: T,
    saveFn: (data: T) => Promise<void>,
    options: AutoSaveOptions = {}
): AutoSaveState & { saveNow: () => Promise<void> } {
    const { intervalMs = 15_000, enabled = true } = options;
    const dataRef = useRef(data);
    const lastSavedDataRef = useRef(data);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [state, setState] = useState<AutoSaveState>({
        lastSavedAt: null,
        isSaving: false,
        error: null,
    });

    dataRef.current = data;

    const saveNow = useCallback(async () => {
        const current = dataRef.current;
        if (JSON.stringify(current) === JSON.stringify(lastSavedDataRef.current)) {
            return;
        }
        setState((s) => ({ ...s, isSaving: true, error: null }));
        try {
            await saveFn(current);
            lastSavedDataRef.current = current;
            setState({ lastSavedAt: new Date(), isSaving: false, error: null });
        } catch (err) {
            setState((s) => ({
                ...s,
                isSaving: false,
                error: err instanceof Error ? err.message : 'Auto-save failed',
            }));
        }
    }, [saveFn]);

    useEffect(() => {
        if (!enabled) return;

        timerRef.current = setInterval(() => {
            saveNow();
        }, intervalMs);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [enabled, intervalMs, saveNow]);

    // Save on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // Save when tab visibility changes (resume on reconnect)
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                saveNow();
            }
        };
        const handleOnline = () => {
            saveNow();
        };
        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('online', handleOnline);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('online', handleOnline);
        };
    }, [saveNow]);

    return { ...state, saveNow };
}
