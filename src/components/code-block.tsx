'use client';

import { useState } from 'react';

const CodeBlock = ({ code, language }: { code: string; language?: string }) => {
    const [copied, setCopied] = useState(false);
    const lines = (code || '').split('\n');
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (e) {
            // ignore
        }
    };

    return (
        <div className="my-6 rounded-lg overflow-hidden border border-white/6">
            <div className="flex items-center justify-between bg-gray-800 px-4 py-2 border-b border-white/6">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-[#ff5f56] ring-0" />
                        <span className="h-3 w-3 rounded-full bg-[#ffbd2e] ring-0" />
                        <span className="h-3 w-3 rounded-full bg-[#27c93f] ring-0" />
                    </div>
                    <div className="text-xs text-white/60 uppercase tracking-wide">
                        {language ? language : 'Shell'}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCopy}
                        className="text-xs bg-white/6 hover:bg-white/8 text-white/80 px-3 py-1 rounded"
                        aria-label="Copy code"
                    >
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                </div>
            </div>
            <pre className="bg-gray-900 p-6 text-sm overflow-x-auto font-mono text-white/90">
                <div className="flex">
                    <ol className="pr-4 text-right select-none text-white/50 text-xs leading-6 tabular-nums">
                        {lines.map((_, i) => (
                            <li key={i} className="leading-6">
                                {i + 1}
                            </li>
                        ))}
                    </ol>
                    <div className="flex-1 leading-6 whitespace-pre">
                        {lines.map((line, i) => (
                            <div key={i} className="min-h-[1.5rem]">
                                {line === '' ? '\u00A0' : line}
                            </div>
                        ))}
                    </div>
                </div>
            </pre>
        </div>
    );
};

export default CodeBlock;
