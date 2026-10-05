'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { ChatMessage, ChatStreamEvent, ThinkingStep } from '@/types';

/** Messages sent per request. The server trims these further to fit its token budget. */
const MAX_HISTORY = 20;

const ERROR_MESSAGE = 'Sorry, I ran into an error. Please try again.';

let idCounter = 0;
const createId = () => `${Date.now()}-${idCounter++}`;

/** Parses the `data:` lines of a server-sent event stream. */
async function* readEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<ChatStreamEvent> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });

        const frames = buffer.split('\n\n');
        buffer = done ? '' : frames.pop() ?? '';

        for (const frame of frames) {
            for (const line of frame.split('\n')) {
                if (!line.startsWith('data: ')) continue;
                try {
                    yield JSON.parse(line.slice(6));
                } catch {
                    // Skip a malformed frame rather than drop the whole reply.
                }
            }
        }

        if (done) return;
    }
}

const appendReasoning = (steps: ThinkingStep[], delta: string): ThinkingStep[] => {
    const last = steps.at(-1);
    return last?.kind === 'reasoning'
        ? [...steps.slice(0, -1), { ...last, text: last.text + delta }]
        : [...steps, { kind: 'reasoning', text: delta }];
};

/** Folds one stream event into the assistant reply it belongs to. */
const applyEvent = (
    current: ChatMessage,
    event: ChatStreamEvent,
    startedAt: number
): ChatMessage => {
    if (event.type === 'status') return { ...current, status: event.message };

    // Any other event means the wait the status described is over.
    const reply = current.status ? { ...current, status: undefined } : current;
    const steps = reply.steps ?? [];
    const thinkingMs = Date.now() - startedAt;

    switch (event.type) {
        case 'reasoning':
            return { ...reply, steps: appendReasoning(steps, event.delta), thinkingMs };
        case 'tool_start':
            return {
                ...reply,
                steps: [
                    ...steps,
                    {
                        kind: 'tool',
                        id: event.id,
                        name: event.name,
                        server: event.server,
                        input: event.input,
                        status: 'running',
                    },
                ],
                thinkingMs,
            };
        case 'tool_end':
            return {
                ...reply,
                steps: steps.map((step) =>
                    step.kind === 'tool' && step.id === event.id
                        ? {
                              ...step,
                              output: event.output,
                              status: event.isError ? 'error' : 'done',
                          }
                        : step
                ),
                thinkingMs,
            };
        case 'text':
            return { ...reply, content: reply.content + event.delta };
        case 'error':
            return {
                ...reply,
                content: reply.content ? `${reply.content}\n\n${event.message}` : event.message,
                failed: true,
            };
        default:
            return reply;
    }
};

/** Tool calls cut off by the stop button would otherwise spin forever. */
const settleRunningTools = (reply: ChatMessage): ChatMessage => ({
    ...reply,
    steps: reply.steps?.map((step) =>
        step.kind === 'tool' && step.status === 'running'
            ? { ...step, status: 'error', output: 'Stopped before it finished.' }
            : step
    ),
});

/**
 * The conversation with Leo: sends questions to /api/chat and streams each reply in, with its
 * reasoning and tool calls, as it happens.
 */
export const useChat = (greeting: string) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: 'greeting', role: 'assistant', content: greeting },
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => () => abortRef.current?.abort(), []);

    const send = useCallback(
        async (text: string) => {
            const question = text.trim();
            if (!question || isLoading) return;

            const userMessage: ChatMessage = { id: createId(), role: 'user', content: question };
            let reply: ChatMessage = { id: createId(), role: 'assistant', content: '', steps: [] };

            const history = [...messages, userMessage]
                .filter((message) => message.content.trim() && !message.failed)
                .slice(-MAX_HISTORY)
                .map(({ role, content }) => ({ role, content }));

            setMessages((prev) => [...prev, userMessage, reply]);
            setIsLoading(true);

            const controller = new AbortController();
            abortRef.current = controller;
            const startedAt = Date.now();

            // Tokens can arrive hundreds of times a second; render at most once a frame.
            let frame = 0;
            const flush = () => {
                frame = 0;
                const snapshot = reply;
                setMessages((prev) => prev.map((m) => (m.id === snapshot.id ? snapshot : m)));
            };

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages: history }),
                    signal: controller.signal,
                });
                if (!response.ok || !response.body) {
                    throw new Error(`Chat request failed with ${response.status}`);
                }

                for await (const event of readEvents(response.body)) {
                    reply = applyEvent(reply, event, startedAt);
                    frame ||= requestAnimationFrame(flush);
                }
            } catch (error) {
                if ((error as Error).name !== 'AbortError') {
                    console.error('[LLM] Chat request failed:', error);
                    reply = applyEvent(reply, { type: 'error', message: ERROR_MESSAGE }, startedAt);
                }
            } finally {
                cancelAnimationFrame(frame);
                const final = settleRunningTools(reply);
                const isEmpty = !final.content.trim() && !final.steps?.length;
                setMessages((prev) =>
                    isEmpty
                        ? prev.filter((m) => m.id !== final.id)
                        : prev.map((m) => (m.id === final.id ? final : m))
                );
                setIsLoading(false);
                abortRef.current = null;
            }
        },
        [isLoading, messages]
    );

    const stop = useCallback(() => abortRef.current?.abort(), []);

    return { messages, isLoading, send, stop };
};
