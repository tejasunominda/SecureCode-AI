export interface NetworkQualityMetrics {
    online: boolean;
    rttMs: number;
    jitterMs: number;
    packetLossPercent: number;
}

type MetricsListener = (metrics: NetworkQualityMetrics) => void;

class NetworkQualityMonitor {
    private listeners = new Set<MetricsListener>();
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private lastRtt = 0;
    private prevRtt = 0;

    onMetrics(listener: MetricsListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    start(intervalMs: number = 15000): void {
        if (this.intervalId !== null) return;
        this.measure();
        this.intervalId = setInterval(() => this.measure(), intervalMs);
    }

    stop(): void {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    private async measure(): Promise<void> {
        const online = navigator.onLine;
        if (!online) {
            this.emit({ online: false, rttMs: 0, jitterMs: 0, packetLossPercent: 100 });
            return;
        }

        try {
            const start = performance.now();
            await fetch('/actuator/health', {
                method: 'HEAD',
                cache: 'no-store',
                mode: 'no-cors',
            });
            const rtt = Math.round(performance.now() - start);

            this.prevRtt = this.lastRtt;
            this.lastRtt = rtt;

            const jitter = this.prevRtt > 0 ? Math.abs(rtt - this.prevRtt) : 0;

            this.emit({
                online: true,
                rttMs: rtt,
                jitterMs: jitter,
                packetLossPercent: 0,
            });
        } catch {
            this.emit({
                online: navigator.onLine,
                rttMs: this.lastRtt || 9999,
                jitterMs: 0,
                packetLossPercent: 100,
            });
        }
    }

    private emit(metrics: NetworkQualityMetrics): void {
        this.listeners.forEach((fn) => fn(metrics));
    }
}

export const networkQualityMonitor = new NetworkQualityMonitor();
