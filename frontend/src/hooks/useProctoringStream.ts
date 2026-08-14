import { useState, useEffect, useRef, useCallback } from 'react';

export interface ProctoringUpdate {
    sessionId: string;
    candidateName?: string;
    eventType: string;
    riskScore: number;
    warnings: number;
    cameraActive: boolean;
    faceStatus: string;
    timestamp: string;
}

interface UseProctoringStreamOptions {
    url?: string;
    enabled?: boolean;
}

export function useProctoringStream(options: UseProctoringStreamOptions = {}) {
    const { url, enabled = true } = options;
    const [updates, setUpdates] = useState<Record<string, ProctoringUpdate>>({});
    const [connected, setConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const wsUrl = url ?? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/proctoring`;

    const connect = useCallback(() => {
        if (!enabled) return;
        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => setConnected(true);
            ws.onclose = () => {
                setConnected(false);
                if (enabled) {
                    reconnectTimerRef.current = setTimeout(connect, 3000);
                }
            };
            ws.onerror = () => {
                ws.close();
            };
            ws.onmessage = (event) => {
                try {
                    const data: ProctoringUpdate = JSON.parse(event.data);
                    setUpdates(prev => ({
                        ...prev,
                        [data.sessionId]: data,
                    }));
                } catch {
                    // ignore malformed messages
                }
            };
        } catch {
            // WebSocket not available, schedule retry
            if (enabled) {
                reconnectTimerRef.current = setTimeout(connect, 5000);
            }
        }
    }, [wsUrl, enabled]);

    useEffect(() => {
        connect();
        return () => {
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            wsRef.current?.close();
        };
    }, [connect]);

    const clearSession = useCallback((sessionId: string) => {
        setUpdates(prev => {
            const next = { ...prev };
            delete next[sessionId];
            return next;
        });
    }, []);

    return {
        updates,
        connected,
        clearSession,
        sessionList: Object.values(updates),
    };
}
