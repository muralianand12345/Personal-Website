'use client';

import { memo } from 'react';

import type { ChatMessage as ChatMessageData } from '@/types';
import ChatMarkdown from '@/components/chat/chat-markdown';
import ThinkingPanel from '@/components/chat/thinking-panel';

type ChatMessageProps = {
    message: ChatMessageData;
    /** This is the reply currently streaming in. */
    isStreaming: boolean;
};

/** Memoized so only the reply that is streaming re-renders on each token. */
const ChatMessage = memo(({ message, isStreaming }: ChatMessageProps) => {
    if (message.role === 'user') {
        return (
            <div className="flex justify-end">
                <div className="min-w-0 max-w-[85%] rounded-2xl rounded-br-md bg-white px-3.5 py-2.5 text-sm text-black">
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                </div>
            </div>
        );
    }

    const steps = message.steps ?? [];
    const lastStep = steps.at(-1);
    // Still thinking until answer text arrives, or while a tool it called is running.
    const isThinking =
        isStreaming &&
        (!message.content || (lastStep?.kind === 'tool' && lastStep.status === 'running'));

    return (
        <div className="flex justify-start">
            <div
                className={`min-w-0 max-w-[92%] rounded-2xl rounded-bl-md border px-3.5 py-2.5 text-sm ${
                    message.failed
                        ? 'border-red-300/20 bg-red-300/[0.06] text-white/75'
                        : 'border-white/10 bg-white/[0.06] text-white/85'
                }`}
            >
                {(isThinking || steps.length > 0) && (
                    <ThinkingPanel
                        steps={steps}
                        thinkingMs={message.thinkingMs}
                        isActive={isThinking}
                        status={message.status}
                    />
                )}
                {message.content && <ChatMarkdown content={message.content} />}
            </div>
        </div>
    );
});
ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;
