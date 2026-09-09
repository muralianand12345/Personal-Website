'use client';

import type React from 'react';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import ReactMarkdown from 'react-markdown';
import { X, ArrowUp, Square } from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';

import ChatCodeBlock from '@/components/chat-code-block';
import { SYSTEM_PROMPT } from '@/lib/assistant-prompt';
import { ChatMessage, ChatbotModalProps } from '@/types';

const GREETING = "Hi, I'm Leo - Murali's assistant. Ask me about his work, or anything technical.";

const SUGGESTIONS = [
    'What does Murali work on?',
    'Tell me about his RAG experience',
    'What is he studying now?',
];

/** How many turns of conversation to send. The system prompt is always kept on top of these. */
const HISTORY_TURNS = 10;

const markdownComponents = {
    p: ({ node, ...props }: any) => <p className="mb-2 last:mb-0" {...props} />,
    h1: ({ node, ...props }: any) => <h1 className="text-sm font-bold mb-1.5 mt-3 first:mt-0" {...props} />,
    h2: ({ node, ...props }: any) => <h2 className="text-sm font-bold mb-1.5 mt-3 first:mt-0" {...props} />,
    h3: ({ node, ...props }: any) => <h3 className="text-xs font-bold mb-1 mt-2 first:mt-0" {...props} />,
    ul: ({ node, ...props }: any) => (
        <ul className="list-disc list-outside pl-4 mb-2 space-y-1 marker:text-white/30" {...props} />
    ),
    ol: ({ node, ...props }: any) => (
        <ol className="list-decimal list-outside pl-4 mb-2 space-y-1 marker:text-white/30" {...props} />
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
        <blockquote className="border-l-2 border-white/25 pl-3 my-2 text-white/60 italic" {...props} />
    ),
    hr: () => <hr className="my-3 border-white/10" />,
};

const TypingDots = () => (
    <div className="flex gap-1 py-1">
        {[0, 150, 300].map((delay) => (
            <span
                key={delay}
                className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
            />
        ))}
    </div>
);

const ChatbotModal = ({ isOpen, onClose }: ChatbotModalProps) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: '0', role: 'system', content: SYSTEM_PROMPT },
        { id: '1', role: 'assistant', content: GREETING },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const visibleMessages = useMemo(() => messages.filter((m) => m.role !== 'system'), [messages]);
    const showSuggestions = visibleMessages.length === 1 && !isLoading;

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!document.getElementById('katex-styles')) {
            const link = document.createElement('link');
            link.id = 'katex-styles';
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/katex/dist/katex.min.css';
            document.head.appendChild(link);
        }
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [visibleMessages]);

    useEffect(() => {
        if (isOpen) inputRef.current?.focus();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previous;
        };
    }, [isOpen]);

    useEffect(() => () => abortControllerRef.current?.abort(), []);

    const send = async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || isLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: trimmed,
        };

        const baseMessages = messages.filter(
            (message) => !(message.role === 'assistant' && message.content.trim() === '')
        );
        const updatedMessages = [...baseMessages, userMessage];
        setInput('');
        setIsLoading(true);

        const assistantMessageId = (Date.now() + 1).toString();
        setMessages([
            ...updatedMessages,
            { id: assistantMessageId, role: 'assistant', content: '' },
        ]);

        abortControllerRef.current = new AbortController();

        try {
            // The system prompt is pinned outside the window so it survives long threads.
            const system = updatedMessages.find((m) => m.role === 'system');
            const history = updatedMessages
                .filter((m) => m.role !== 'system')
                .slice(-HISTORY_TURNS);
            const messagesToSend = [...(system ? [system] : []), ...history].map((msg) => ({
                role: msg.role,
                content: msg.content,
            }));

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: messagesToSend }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) throw new Error('Failed to get response from AI');

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let accumulatedContent = '';
            let sseBuffer = '';

            while (true) {
                const { done, value } = await reader.read();
                sseBuffer += done ? decoder.decode() : decoder.decode(value, { stream: true });

                const events = sseBuffer.split('\n\n');
                sseBuffer = events.pop() ?? '';

                for (const event of events) {
                    for (const line of event.split('\n')) {
                        if (!line.startsWith('data: ')) continue;

                        const data = line.slice(6).trim();
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            if (!parsed.content) continue;

                            accumulatedContent += parsed.content;
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantMessageId
                                        ? { ...m, content: accumulatedContent }
                                        : m
                                )
                            );
                        } catch {
                            // Skip invalid JSON payloads.
                        }
                    }
                }

                if (done) break;
            }

            if (accumulatedContent.trim() === '')
                setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
        } catch (error: any) {
            if (error.name === 'AbortError') {
                // Keep whatever streamed in before the user hit stop.
                setMessages((prev) =>
                    prev.filter((m) => !(m.id === assistantMessageId && m.content.trim() === ''))
                );
                return;
            }

            console.error('[LLM] Error sending message:', error);
            setMessages((prev) => [
                ...prev.filter((m) => m.id !== assistantMessageId),
                {
                    id: (Date.now() + 2).toString(),
                    role: 'assistant',
                    content: 'Sorry, I ran into an error. Please try again.',
                },
            ]);
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] sm:z-50">
            <div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] sm:z-40"
                onClick={onClose}
                aria-hidden="true"
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-label="Chat with Leo"
                className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[26rem] sm:h-[min(38rem,calc(100vh-6rem))] m-4 sm:m-0 bg-black border border-white/10 rounded-xl shadow-2xl z-[101] sm:z-50 flex flex-col overflow-hidden"
            >
                <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-white text-black grid place-items-center text-sm font-bold">
                            L
                        </span>
                        <div>
                            <h2 className="text-sm font-semibold leading-tight">Leo</h2>
                            <p className="text-xs text-white/40 leading-tight">
                                Murali&apos;s AI assistant
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 -mr-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                        aria-label="Close chat"
                    >
                        <X size={18} />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3">
                    {visibleMessages.map((message) => {
                        const isStreamingPlaceholder =
                            message.role === 'assistant' && message.content.trim() === '';

                        if (isStreamingPlaceholder && !isLoading) return null;

                        return (
                            <div
                                key={message.id}
                                className={`flex ${
                                    message.role === 'user' ? 'justify-end' : 'justify-start'
                                }`}
                            >
                                <div
                                    className={`min-w-0 px-3.5 py-2.5 text-sm ${
                                        message.role === 'user'
                                            ? 'max-w-[85%] bg-white text-black rounded-2xl rounded-br-md'
                                            : 'max-w-[92%] bg-white/[0.06] border border-white/10 text-white/85 rounded-2xl rounded-bl-md'
                                    }`}
                                >
                                    {message.role === 'user' ? (
                                        <p className="whitespace-pre-wrap break-words">
                                            {message.content}
                                        </p>
                                    ) : isStreamingPlaceholder ? (
                                        <TypingDots />
                                    ) : (
                                        <div className="leading-relaxed break-words">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm, remarkMath]}
                                                rehypePlugins={[rehypeRaw as any, rehypeKatex as any]}
                                                components={markdownComponents}
                                            >
                                                {message.content}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {showSuggestions && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {SUGGESTIONS.map((suggestion) => (
                                <button
                                    key={suggestion}
                                    onClick={() => send(suggestion)}
                                    className="text-xs px-3 py-1.5 rounded-full border border-white/15 text-white/60 hover:text-white hover:border-white/40 hover:bg-white/5 transition-colors"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        send(input);
                    }}
                    className="border-t border-white/10 p-3 shrink-0"
                >
                    <div className="flex items-center gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about Murali..."
                            aria-label="Message"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    send(input);
                                }
                            }}
                            className="flex-1 min-w-0 bg-white/5 text-white placeholder:text-white/35 px-4 py-2.5 rounded-full border border-white/10 focus:border-white/30 focus:outline-none transition-colors text-sm"
                        />
                        {isLoading ? (
                            <button
                                type="button"
                                onClick={() => abortControllerRef.current?.abort()}
                                aria-label="Stop generating"
                                className="shrink-0 w-10 h-10 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                            >
                                <Square size={14} fill="currentColor" />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={!input.trim()}
                                aria-label="Send message"
                                className="shrink-0 w-10 h-10 grid place-items-center rounded-full bg-white text-black hover:bg-white/90 disabled:bg-white/10 disabled:text-white/30 transition-colors"
                            >
                                <ArrowUp size={18} />
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChatbotModal;
