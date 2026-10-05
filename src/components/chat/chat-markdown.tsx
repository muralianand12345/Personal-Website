'use client';

import { memo } from 'react';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import ReactMarkdown from 'react-markdown';

import ChatCodeBlock from '@/components/chat/chat-code-block';

const markdownComponents = {
    p: ({ node, ...props }: any) => <p className="mb-2 last:mb-0" {...props} />,
    h1: ({ node, ...props }: any) => (
        <h1 className="text-sm font-bold mb-1.5 mt-3 first:mt-0" {...props} />
    ),
    h2: ({ node, ...props }: any) => (
        <h2 className="text-sm font-bold mb-1.5 mt-3 first:mt-0" {...props} />
    ),
    h3: ({ node, ...props }: any) => (
        <h3 className="text-xs font-bold mb-1 mt-2 first:mt-0" {...props} />
    ),
    ul: ({ node, ...props }: any) => (
        <ul
            className="list-disc list-outside pl-4 mb-2 space-y-1 marker:text-white/30"
            {...props}
        />
    ),
    ol: ({ node, ...props }: any) => (
        <ol
            className="list-decimal list-outside pl-4 mb-2 space-y-1 marker:text-white/30"
            {...props}
        />
    ),
    li: ({ node, ...props }: any) => <li className="leading-relaxed" {...props} />,
    code: ({ node, className, children, ...props }: any) => {
        const codeContent = String(children ?? '');
        if (!codeContent.trim()) return null;
        return (
            <code
                className="bg-white/10 border border-white/10 px-1 py-0.5 rounded text-[0.85em] font-mono text-white/90 break-words"
                {...props}
            >
                {codeContent}
            </code>
        );
    },
    pre: ({ children }: any) => {
        const codeElement = Array.isArray(children) ? children[0] : children;
        const codeProps = codeElement?.props ?? {};
        const codeContent = String(codeProps.children ?? '').replace(/\n$/, '');
        if (!codeContent.trim()) return null;

        const match = /language-(\w+)/.exec(codeProps.className || '');
        return <ChatCodeBlock code={codeContent} language={match?.[1]} />;
    },
    table: ({ node, ...props }: any) => (
        <div className="overflow-x-auto my-2">
            <table className="border-collapse text-xs w-full" {...props} />
        </div>
    ),
    thead: ({ node, ...props }: any) => <thead className="bg-white/[0.06]" {...props} />,
    tr: ({ node, ...props }: any) => <tr className="border-b border-white/10" {...props} />,
    th: ({ node, ...props }: any) => (
        <th className="px-2 py-1.5 text-left font-semibold text-white/80" {...props} />
    ),
    td: ({ node, ...props }: any) => <td className="px-2 py-1.5 text-white/70" {...props} />,
    a: ({ node, ...props }: any) => (
        <a
            className="text-white underline decoration-white/30 underline-offset-2 hover:decoration-white break-words"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
        />
    ),
    strong: ({ node, ...props }: any) => <strong className="font-semibold text-white" {...props} />,
    em: ({ node, ...props }: any) => <em className="italic" {...props} />,
    blockquote: ({ node, ...props }: any) => (
        <blockquote
            className="border-l-2 border-white/25 pl-3 my-2 text-white/60 italic"
            {...props}
        />
    ),
    hr: () => <hr className="my-3 border-white/10" />,
};

/**
 * gpt-oss sometimes cites in its browsing format, `【0†L2-L8】`, despite the prompt asking for
 * markdown links. The markers point at nothing the reader can see, so they are dropped.
 */
const CITATION_MARKER = /【[^【】]*†[^【】]*】/g;

/** Memoized so finished messages are not re-parsed while a new reply streams in. */
const ChatMarkdown = memo(({ content }: { content: string }) => (
    <div className="leading-relaxed break-words">
        <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeRaw as any, rehypeKatex as any]}
            components={markdownComponents}
        >
            {content.replace(CITATION_MARKER, '')}
        </ReactMarkdown>
    </div>
));
ChatMarkdown.displayName = 'ChatMarkdown';

export default ChatMarkdown;
