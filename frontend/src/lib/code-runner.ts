export interface TestCaseResult {
    input: string;
    expectedOutput: string;
    actualOutput: string;
    passed: boolean;
    runtimeMs: number;
}

export interface RunCodeResult {
    visiblePassed: number;
    visibleTotal: number;
    hiddenPassed: number;
    hiddenTotal: number;
    visibleResults: TestCaseResult[];
    hiddenResults: TestCaseResult[];
    allVisiblePassed: boolean;
    allHiddenPassed: boolean;
}

interface ParsedTestCase {
    input: string;
    expected: string;
}

let pyodidePromise: Promise<any> | null = null;

async function loadPyodide(): Promise<any> {
    if (pyodidePromise) return pyodidePromise;
    pyodidePromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';
        script.onload = async () => {
            try {
                const pyodide = await (window as any).loadPyodide();
                resolve(pyodide);
            } catch (err) {
                reject(err);
            }
        };
        script.onerror = () => reject(new Error('Failed to load Pyodide'));
        document.head.appendChild(script);
    });
    return pyodidePromise;
}

function parseTestCases(raw: string | null): ParsedTestCase[] {
    if (!raw || !raw.trim()) return [];
    const cases: ParsedTestCase[] = [];
    for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const arrowIdx = trimmed.indexOf('=>');
        if (arrowIdx < 0) continue;

        const before = trimmed.substring(0, arrowIdx).trim();
        const after = trimmed.substring(arrowIdx + 2).trim();

        let input = before;
        const inputIdx = before.toLowerCase().indexOf('input:');
        if (inputIdx >= 0) input = before.substring(inputIdx + 6).trim();

        let expected = after;
        const outputIdx = after.toLowerCase().indexOf('output:');
        if (outputIdx >= 0) expected = after.substring(outputIdx + 7).trim();

        if (input && expected) cases.push({ input, expected });
    }
    return cases;
}

function stripQuotes(s: string): string {
    return s.replace(/^["']|["']$/g, '');
}

function evalJavaScript(code: string, input: string): string {
    try {
        const wrappedCode = `
            ${code}
            return solution(${input});
        `;
        const fn = new Function(wrappedCode);
        const result = fn();
        return result !== null && result !== undefined ? String(result) : 'null';
    } catch (err) {
        throw new Error(err instanceof Error ? err.message : String(err));
    }
}

async function evalPython(pyodide: any, code: string, input: string): Promise<string> {
    try {
        pyodide.runPython(code);

        const inputStr = input.trim();
        let callExpr: string;

        if (inputStr.startsWith('"') || inputStr.startsWith("'")) {
            callExpr = inputStr;
        } else if (inputStr.startsWith('[')) {
            callExpr = inputStr;
        } else if (/^-?\d+$/.test(inputStr)) {
            callExpr = inputStr;
        } else if (/^-?\d+\.\d+$/.test(inputStr)) {
            callExpr = inputStr;
        } else {
            callExpr = `"${inputStr}"`;
        }

        const result = pyodide.runPython(`solution(${callExpr})`);
        if (result === null || result === undefined) return 'null';
        return String(result);
    } catch (err) {
        throw new Error(err instanceof Error ? err.message : String(err));
    }
}

function compareResults(actual: string, expected: string): boolean {
    const actualClean = stripQuotes(actual.trim());
    const expectedClean = stripQuotes(expected.trim());
    return actualClean === expectedClean || actual.trim() === expected.trim();
}

async function evaluateCases(
    cases: ParsedTestCase[],
    code: string,
    language: string
): Promise<TestCaseResult[]> {
    const results: TestCaseResult[] = [];
    let pyodide: any = null;

    if (language === 'python') {
        pyodide = await loadPyodide();
    }

    for (const tc of cases) {
        let actual = '';
        let passed = false;
        const startTime = performance.now();
        try {
            if (language === 'javascript') {
                actual = evalJavaScript(code, tc.input);
            } else if (language === 'python') {
                actual = await evalPython(pyodide, code, tc.input);
            } else {
                actual = `Not supported for ${language}`;
            }
            passed = compareResults(actual, tc.expected);
        } catch (err) {
            actual = `Error: ${err instanceof Error ? err.message : String(err)}`;
            passed = false;
        }
        const runtimeMs = Math.round(performance.now() - startTime);
        results.push({
            input: tc.input,
            expectedOutput: tc.expected,
            actualOutput: actual,
            passed,
            runtimeMs,
        });
    }
    return results;
}

export async function runCode(
    visibleTestCases: string | null,
    hiddenTestCases: string | null,
    code: string,
    language: string
): Promise<RunCodeResult> {
    const visibleCases = parseTestCases(visibleTestCases);
    const hiddenCases = parseTestCases(hiddenTestCases);

    const [visibleResults, hiddenResults] = await Promise.all([
        evaluateCases(visibleCases, code, language),
        evaluateCases(hiddenCases, code, language),
    ]);

    const visiblePassed = visibleResults.filter((r) => r.passed).length;
    const hiddenPassed = hiddenResults.filter((r) => r.passed).length;

    return {
        visiblePassed,
        visibleTotal: visibleResults.length,
        hiddenPassed,
        hiddenTotal: hiddenResults.length,
        visibleResults,
        hiddenResults,
        allVisiblePassed: visiblePassed === visibleResults.length && visibleResults.length > 0,
        allHiddenPassed: hiddenPassed === hiddenResults.length && hiddenResults.length > 0,
    };
}
