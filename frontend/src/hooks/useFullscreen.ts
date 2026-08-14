import { useState, useEffect, useCallback, useRef } from 'react';

interface FullscreenState {
    isFullscreen: boolean;
    enterFullscreen: () => Promise<void>;
    exitFullscreen: () => Promise<void>;
    toggleFullscreen: () => Promise<void>;
}

export function useFullscreen(targetRef?: React.RefObject<HTMLElement>): FullscreenState {
    const [isFullscreen, setIsFullscreen] = useState(false);

    const getTarget = useCallback((): HTMLElement | null => {
        if (targetRef?.current) return targetRef.current;
        return document.documentElement;
    }, [targetRef]);

    const enterFullscreen = useCallback(async () => {
        const el = getTarget();
        if (!el) return;
        try {
            if (el.requestFullscreen) {
                await el.requestFullscreen();
            } else if ((el as any).webkitRequestFullscreen) {
                await (el as any).webkitRequestFullscreen();
            } else if ((el as any).mozRequestFullScreen) {
                await (el as any).mozRequestFullScreen();
            }
        } catch {
            // Fullscreen may be blocked by browser settings
        }
    }, [getTarget]);

    const exitFullscreen = useCallback(async () => {
        try {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            } else if ((document as any).webkitExitFullscreen) {
                await (document as any).webkitExitFullscreen();
            }
        } catch {
            // ignore
        }
    }, []);

    const toggleFullscreen = useCallback(async () => {
        if (isFullscreen) {
            await exitFullscreen();
        } else {
            await enterFullscreen();
        }
    }, [isFullscreen, enterFullscreen, exitFullscreen]);

    useEffect(() => {
        const handler = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handler);
        document.addEventListener('webkitfullscreenchange', handler);
        return () => {
            document.removeEventListener('fullscreenchange', handler);
            document.removeEventListener('webkitfullscreenchange', handler);
        };
    }, []);

    return { isFullscreen, enterFullscreen, exitFullscreen, toggleFullscreen };
}

interface FullscreenEnforcerOptions {
    enabled: boolean;
    onExit?: () => void;
    warningMessage?: string;
}

export function useFullscreenEnforcer(options: FullscreenEnforcerOptions) {
    const { enabled, onExit, warningMessage = 'Please stay in fullscreen mode during the assessment.' } = options;
    const { isFullscreen, enterFullscreen } = useFullscreen();
    const exitCountRef = useRef(0);

    useEffect(() => {
        if (!enabled) return;
        enterFullscreen();
    }, [enabled, enterFullscreen]);

    useEffect(() => {
        if (!enabled) return;
        if (!isFullscreen) {
            exitCountRef.current += 1;
            onExit?.();
            // Auto re-enter after a short delay
            const timer = setTimeout(() => {
                enterFullscreen();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isFullscreen, enabled, onExit, enterFullscreen, warningMessage]);

    return {
        isFullscreen,
        exitCount: exitCountRef.current,
        enterFullscreen,
    };
}
