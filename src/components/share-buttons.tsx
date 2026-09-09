'use client';

import { useState } from 'react';
import { Check, Link2 } from 'lucide-react';

const ShareButtons = ({ title, url }: { title: string; url: string }) => {
    const [copied, setCopied] = useState(false);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard unavailable (insecure origin or denied permission).
        }
    };

    const linkClass =
        'text-sm text-white/50 hover:text-white transition-colors underline-offset-4 hover:underline';

    return (
        <div className="flex items-center gap-5">
            <span className="text-sm text-white/40">Share</span>
            <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
            >
                X
            </a>
            <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
            >
                LinkedIn
            </a>
            <button onClick={copyLink} className={`${linkClass} flex items-center gap-1.5`}>
                {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy link'}
            </button>
        </div>
    );
};

export default ShareButtons;
