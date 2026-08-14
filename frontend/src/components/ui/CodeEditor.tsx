import Editor, { type OnMount } from '@monaco-editor/react';

const LANGUAGE_MAP: Record<string, string> = {
    javascript: 'javascript',
    python: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    sql: 'sql',
};

const DEFAULT_CODE: Record<string, string> = {
    javascript: 'function solution(input) {\n  // Write your solution here\n  return result;\n}',
    python: 'def solution(input):\n    # Write your solution here\n    return result',
    java: 'public class Solution {\n    public static Object solution(String input) {\n        // Write your solution here\n        return null;\n    }\n}',
    cpp: '#include <iostream>\n#include <string>\nusing namespace std;\n\nstring solution(string input) {\n    // Write your solution here\n    return "";\n}',
    c: '#include <stdio.h>\n#include <string.h>\n\nchar* solution(char* input) {\n    // Write your solution here\n    return input;\n}',
};

interface CodeEditorProps {
    value: string;
    onChange: (value: string) => void;
    language?: string;
    height?: string;
    readOnly?: boolean;
}

export function CodeEditor({
    value,
    onChange,
    language = 'python',
    height = '100%',
    readOnly = false,
}: CodeEditorProps) {
    const monacoLang = LANGUAGE_MAP[language.toLowerCase()] ?? 'plaintext';

    const handleMount: OnMount = (editor) => {
        editor.focus();
    };

    return (
        <Editor
            height={height}
            language={monacoLang}
            value={value || (DEFAULT_CODE[language.toLowerCase()] ?? '')}
            onChange={(val) => onChange(val ?? '')}
            onMount={handleMount}
            theme="vs-dark"
            options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
                fontLigatures: true,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 4,
                insertSpaces: true,
                automaticLayout: true,
                readOnly,
                scrollbar: {
                    vertical: 'auto',
                    horizontal: 'auto',
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8,
                },
                padding: { top: 12, bottom: 12 },
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                renderLineHighlight: 'all',
                bracketPairColorization: { enabled: true },
                guides: { bracketPairs: true, indentation: true },
            }}
        />
    );
}
