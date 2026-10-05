'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/**
 * Compact sibling of components/code-block.tsx, sized for the chat panel:
 * same monochrome treatment as the blog, without line numbers or the title bar.
 */
const ChatCodeBlock = ({ code, language }: { code: string; language?: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard unavailable.
        }
    };

    return (
        <div className="my-2 rounded-lg border border-white/10 overflow-hidden bg-white/[0.04]">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
                <span className="text-[10px] uppercase tracking-wider text-white/40">
                    {language || 'code'}
                </span>
                <button
                    onClick={handleCopy}
                    aria-label="Copy code"
                    className="text-white/40 hover:text-white transition-colors"
                >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
            </div>
            <pre className="px-3 py-2.5 overflow-x-auto text-xs leading-relaxed font-mono text-white/85">
                <code>{code}</code>
            </pre>
        </div>
    );
};

export default ChatCodeBlock;
