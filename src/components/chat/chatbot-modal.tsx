'use client';

import { X, ArrowUp, Square, Maximize2, Minimize2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';

import { useChat } from '@/hooks/use-chat';
import { ChatbotModalProps } from '@/types';
import LeoMark from '@/components/chat/leo-mark';
import ChatMessage from '@/components/chat/chat-message';
import { useStickToBottom } from '@/hooks/use-stick-to-bottom';
import { useResizablePanel } from '@/hooks/use-resizable-panel';

const GREETING = "Hi, I'm Leo - Murali's assistant. Ask me about his work, or anything technical.";

const SUGGESTIONS = [
    'What does Murali work on?',
    'What has he pushed to GitHub lately?',
    "What's new in AI this week?",
];

const ChatbotModal = ({ isOpen, onClose }: ChatbotModalProps) => {
    const { messages, isLoading, send, stop } = useChat(GREETING);
    const [input, setInput] = useState('');
    // Follow the reply as it streams, unless the reader has scrolled up to look at something.
    const conversation = useStickToBottom<HTMLDivElement>(messages);
    const inputRef = useRef<HTMLInputElement>(null);
    const panel = useResizablePanel<HTMLDivElement>();

    const showSuggestions = messages.length === 1 && !isLoading;
    const streamingId = isLoading ? messages.at(-1)?.id : undefined;

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

    const submit = (text: string) => {
        if (!text.trim() || isLoading) return;
        conversation.follow();
        setInput('');
        send(text);
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
                ref={panel.ref}
                role="dialog"
                aria-modal="true"
                aria-label="Chat with Leo"
                style={
                    {
                        '--chat-w': `${panel.size.width}px`,
                        '--chat-h': `${panel.size.height}px`,
                    } as CSSProperties
                }
                className={`fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[min(var(--chat-w),calc(100vw-3rem))] sm:h-[min(var(--chat-h),calc(100vh-3rem))] m-4 sm:m-0 bg-black border border-white/10 rounded-xl shadow-2xl z-[101] sm:z-50 flex flex-col overflow-hidden ${
                    panel.isResizing
                        ? 'select-none'
                        : 'sm:transition-[width,height] sm:duration-300 sm:ease-out'
                }`}
            >
                {/* Pinned to the bottom-right corner, so it resizes from its top and left edges. */}
                <div aria-hidden="true" className="hidden sm:block">
                    <div
                        onPointerDown={panel.resizeFrom({ top: true })}
                        className="absolute inset-x-3 top-0 z-10 h-1.5 cursor-ns-resize before:absolute before:inset-x-0 before:top-0 before:h-px before:transition-colors hover:before:bg-white/40"
                    />
                    <div
                        onPointerDown={panel.resizeFrom({ left: true })}
                        className="absolute inset-y-3 left-0 z-10 w-1.5 cursor-ew-resize before:absolute before:inset-y-0 before:left-0 before:w-px before:transition-colors hover:before:bg-white/40"
                    />
                    <div
                        onPointerDown={panel.resizeFrom({ top: true, left: true })}
                        className="absolute left-0 top-0 z-20 h-3 w-3 cursor-nwse-resize"
                    />
                </div>

                <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-white text-black grid place-items-center">
                            <LeoMark className="w-[18px] h-[18px]" />
                        </span>
                        <div>
                            <h2 className="text-sm font-semibold leading-tight">Leo</h2>
                            <p className="text-xs text-white/40 leading-tight">
                                Murali&apos;s AI assistant
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-0.5 -mr-1.5">
                        <button
                            onClick={panel.toggle}
                            className="hidden sm:grid place-items-center w-[30px] h-[30px] rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                            aria-label={panel.isExpanded ? 'Shrink chat' : 'Expand chat'}
                            title={panel.isExpanded ? 'Shrink' : 'Expand'}
                        >
                            {panel.isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                        </button>
                        <button
                            onClick={onClose}
                            className="grid place-items-center w-[30px] h-[30px] rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                            aria-label="Close chat"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </header>

                <div
                    ref={conversation.ref}
                    onScroll={conversation.onScroll}
                    className="flex-1 overflow-y-auto overscroll-contain px-4 py-4"
                >
                    {/* Capped so lines stay readable when the panel is expanded. */}
                    <div className="mx-auto max-w-3xl space-y-3">
                        {messages.map((message) => (
                            <ChatMessage
                                key={message.id}
                                message={message}
                                isStreaming={message.id === streamingId}
                            />
                        ))}

                        {showSuggestions && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {SUGGESTIONS.map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        onClick={() => submit(suggestion)}
                                        className="text-xs px-3 py-1.5 rounded-full border border-white/15 text-white/60 hover:text-white hover:border-white/40 hover:bg-white/5 transition-colors"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        submit(input);
                    }}
                    className="border-t border-white/10 p-3 shrink-0"
                >
                    <div className="mx-auto flex max-w-3xl items-center gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about Murali..."
                            aria-label="Message"
                            className="flex-1 min-w-0 bg-white/5 text-white placeholder:text-white/35 px-4 py-2.5 rounded-full border border-white/10 focus:border-white/30 focus:outline-none transition-colors text-sm"
                        />
                        {isLoading ? (
                            <button
                                type="button"
                                onClick={stop}
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
