// @ts-ignore - pico.js is a plain JS module with a default export
import pico from './pico.js';

let classifyRegion: ((r: number, c: number, s: number, pixels: Uint8Array, ldim: number) => number) | null = null;
let updateMemory: ((dets: number[][]) => number[][]) | null = null;
let picoLoaded = false;
let nativeDetector: any = null;
let useNative = false;
let loadPromise: Promise<void> | null = null;

export function isFaceDetectorLoaded(): boolean {
    return picoLoaded || useNative;
}

export async function loadFaceDetector(): Promise<void> {
    if (picoLoaded || useNative) return;
    if (loadPromise) return loadPromise;
    loadPromise = doLoad();
    return loadPromise;
}

async function doLoad(): Promise<void> {
    // Try native FaceDetector API first (Chrome/Edge)
    try {
        if ('FaceDetector' in window) {
            // @ts-ignore - FaceDetector is experimental
            nativeDetector = new FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
            useNative = true;
            console.debug('[faceDetection] Using native FaceDetector API');
            return;
        }
    } catch (e) {
        console.debug('[faceDetection] Native FaceDetector not available:', e);
    }

    // Fallback to picojs
    try {
        const response = await fetch('/models/facefinder.cascade');
        if (!response.ok) throw new Error(`Failed to fetch cascade: ${response.status}`);
        const buffer = await response.arrayBuffer();
        console.debug('[faceDetection] cascade file size:', buffer.byteLength);
        const bytes = new Int8Array(buffer);
        classifyRegion = pico.unpack_cascade(bytes);
        updateMemory = pico.instantiate_detection_memory(5);
        picoLoaded = true;
        console.debug('[faceDetection] picojs cascade loaded, tdepth/ntrees valid');
    } catch (err) {
        console.error('Failed to load face detection cascade', err);
        throw err;
    }
}

function rgbaToGrayscale(rgba: Uint8ClampedArray, nrows: number, ncols: number): Uint8Array {
    const gray = new Uint8Array(nrows * ncols);
    for (let r = 0; r < nrows; ++r) {
        for (let c = 0; c < ncols; ++c) {
            gray[r * ncols + c] = (2 * rgba[r * 4 * ncols + 4 * c + 0] + 7 * rgba[r * 4 * ncols + 4 * c + 1] + 1 * rgba[r * 4 * ncols + 4 * c + 2]) / 10;
        }
    }
    return gray;
}

export interface FaceDetectionResult {
    faceCount: number;
    detections: Array<{ r: number; c: number; s: number; q: number }>;
}

async function detectNative(video: HTMLVideoElement): Promise<FaceDetectionResult> {
    if (!nativeDetector) return { faceCount: 0, detections: [] };
    try {
        const faces = await nativeDetector.detect(video);
        console.debug('[faceDetection] native raw detections:', faces.length);
        if (faces.length > 0) {
            faces.forEach((f: any, i: number) => {
                const bb = f.boundingBox;
                console.debug(`[faceDetection] face ${i}: x=${bb.x} y=${bb.y} w=${bb.width} h=${bb.height} area=${(bb.width*bb.height)|0}`);
            });
        }

        if (faces.length === 0) return { faceCount: 0, detections: [] };

        // Sort by area descending (largest first)
        const sorted = faces.map((f: any) => ({ ...f.boundingBox })).sort((a: any, b: any) => (b.width * b.height) - (a.width * a.height));

        // Filter out tiny detections (< 25% of largest face area)
        const largestArea = sorted[0].width * sorted[0].height;
        const minArea = largestArea * 0.25;
        const filtered = sorted.filter((bb: any) => bb.width * bb.height >= minArea);
        console.debug('[faceDetection] after area filter:', filtered.length, '(minArea:', minArea|0, ')');

        // Deduplicate by center distance: merge any detection whose center is within
        // 40% of the largest face dimension from an already-accepted detection
        const accepted: any[] = [];
        const refDist = Math.max(sorted[0].width, sorted[0].height) * 0.4;
        for (const bb of filtered) {
            const cx = bb.x + bb.width / 2;
            const cy = bb.y + bb.height / 2;
            const isDup = accepted.some((a) => {
                const ax = a.x + a.width / 2;
                const ay = a.y + a.height / 2;
                return Math.hypot(cx - ax, cy - ay) < refDist;
            });
            if (!isDup) accepted.push(bb);
        }

        console.debug('[faceDetection] native after dedup:', accepted.length);
        const detections = accepted.map((bb) => ({
            r: bb.y + bb.height / 2,
            c: bb.x + bb.width / 2,
            s: Math.max(bb.width, bb.height),
            q: 1.0,
        }));
        return { faceCount: detections.length, detections };
    } catch (e) {
        console.debug('[faceDetection] native detect error:', e);
        return { faceCount: 0, detections: [] };
    }
}

function detectPico(video: HTMLVideoElement): FaceDetectionResult {
    if (!picoLoaded || !classifyRegion || !updateMemory) {
        return { faceCount: 0, detections: [] };
    }

    const canvas = document.createElement('canvas');
    const w = 640;
    const h = 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { faceCount: 0, detections: [] };

    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const gray = rgbaToGrayscale(imageData.data, h, w);

    const image = {
        pixels: gray,
        nrows: h,
        ncols: w,
        ldim: w,
    };

    const params = {
        shiftfactor: 0.1,
        minsize: 20,
        maxsize: 1000,
        scalefactor: 1.1,
    };

    const dets = pico.run_cascade(image, classifyRegion, params);
    console.debug('[faceDetection] pico raw dets:', dets.length);

    const accumulated = updateMemory!(dets);
    const clustered = pico.cluster_detections(accumulated, 0.2);

    // Filter by quality threshold — cluster score is sum of merged detection scores
    const qthresh = 2.0;
    const filtered = clustered.filter((d: number[]) => d[3] > qthresh);

    // Deduplicate by center distance (same logic as native detector)
    if (filtered.length > 0) {
        filtered.sort((a: number[], b: number[]) => b[2] - a[2]); // sort by size descending
        const refDist = filtered[0][2] * 0.6;
        const accepted: number[][] = [];
        for (const d of filtered) {
            const isDup = accepted.some((a) => {
                const dist = Math.hypot(d[0] - a[0], d[1] - a[1]);
                return dist < refDist;
            });
            if (!isDup) accepted.push(d);
        }
        const validDetections = accepted.map((d: number[]) => ({ r: d[0], c: d[1], s: d[2], q: d[3] }));
        console.debug('[faceDetection] pico clustered:', clustered.length, 'filtered:', filtered.length, 'deduped:', validDetections.length);
        return { faceCount: validDetections.length, detections: validDetections };
    }

    console.debug('[faceDetection] pico clustered:', clustered.length, 'filtered: 0');
    return { faceCount: 0, detections: [] };
}

export async function detectFaces(video: HTMLVideoElement): Promise<FaceDetectionResult> {
    if (useNative && nativeDetector) {
        return detectNative(video);
    }
    return detectPico(video);
}
