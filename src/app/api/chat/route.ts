import { z } from 'zod';

import type { ChatStreamEvent } from '@/types';
import { webhookLogger } from '@/lib/utils';
import { AGENT_CONFIG } from '@/lib/agent/config';
import { streamAgentReply } from '@/lib/agent/agent';
import { describeAgentError } from '@/lib/agent/errors';

export const runtime = 'nodejs';
/** A reply can chain several tool calls, each up to the MCP tool timeout. */
export const maxDuration = 60;

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

const requestSchema = z.object({
    messages: z
        .array(
            z.object({
                role: z.enum(['user', 'assistant']),
                content: z
                    .string()
                    .transform((text) => text.slice(0, AGENT_CONFIG.maxMessageChars)),
            })
        )
        .min(1)
        .max(50)
        .refine(
            (messages) => messages.at(-1)?.role === 'user',
            'The last message must be from the user'
        ),
});

const jsonResponse = (body: object, status: number) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

/** Collects a reply as it streams, for the conversation log. */
const createTranscript = () => {
    const transcript = { reasoning: '', answer: '', tools: [] as string[] };
    return {
        add: (event: ChatStreamEvent) => {
            if (event.type === 'reasoning') transcript.reasoning += event.delta;
            if (event.type === 'text') transcript.answer += event.delta;
            if (event.type === 'error') transcript.answer += `\n[error] ${event.message}`;
            if (event.type === 'tool_start') {
                const source = event.server ? `${event.server} · ` : '';
                transcript.tools.push(
                    `Tool: ${source}${event.name} ${JSON.stringify(event.input)}`
                );
            }
        },
        log: (user: string) =>
            webhookLogger({
                user,
                thinking: [transcript.reasoning, ...transcript.tools].filter(Boolean),
                assistant: transcript.answer || '-',
            }).catch((error) => console.warn('[LLM] webhookLogger failed:', error)),
    };
};

export const OPTIONS = async (): Promise<Response> =>
    new Response(null, { status: 204, headers: CORS_HEADERS });

/**
 * Streams Leo's reply as server-sent events, one `ChatStreamEvent` per `data:` line:
 * reasoning and answer text as they generate, tool calls as they start and finish, then `done`
 * (or `error`).
 */
export const POST = async (request: Request): Promise<Response> => {
    if (!process.env.OPENAI_API_KEY) {
        return jsonResponse({ error: 'OpenAI API key not configured' }, 500);
    }

    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return jsonResponse({ error: 'Invalid chat request' }, 400);

    const { messages } = parsed.data;
    const abort = new AbortController();
    request.signal.addEventListener('abort', () => abort.abort());

    const encoder = new TextEncoder();
    const transcript = createTranscript();

    const body = new ReadableStream<Uint8Array>({
        async start(controller) {
            const send = (event: ChatStreamEvent) => {
                transcript.add(event);
                if (!abort.signal.aborted) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
                }
            };

            try {
                for await (const event of streamAgentReply(messages, abort.signal)) send(event);
                send({ type: 'done' });
            } catch (error) {
                if (!abort.signal.aborted) {
                    console.error('[LLM] Chat agent error:', error);
                    send({ type: 'error', message: describeAgentError(error) });
                }
            } finally {
                if (!abort.signal.aborted) controller.close();
                await transcript.log(messages.at(-1)!.content);
            }
        },
        cancel() {
            abort.abort();
        },
    });

    return new Response(body, {
        headers: {
            ...CORS_HEADERS,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        },
    });
};
