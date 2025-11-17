import { OpenAI } from 'openai';

import { webhookLogger } from '@/lib/utils';

export const runtime = 'nodejs';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export const OPTIONS = async (request: Request): Promise<Response> => {
    try {
        console.info('[LLM] /api/chat OPTIONS', {
            origin: request.headers.get('origin'),
            host: request.headers.get('host'),
            forwarded: request.headers.get('x-forwarded-host'),
        });
    } catch (e) {
        // ignore logging errors
    }

    return new Response(null, { status: 204, headers: CORS_HEADERS });
};

/**
 * Handle POST requests to the /api/chat endpoint with streaming support.
 */
export const POST = async (request: Request): Promise<Response> => {
    try {
        const { messages } = await request.json();
        if (!process.env.OPENAI_API_KEY)
            return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
                status: 500,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });

        const client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: process.env.OPENAI_BASE_URL,
        });

        const stream = await client.chat.completions.create({
            model: 'openai/gpt-oss-20b',
            messages: messages,
            temperature: 0.8,
            max_tokens: 2000,
            stream: true,
            reasoning_effort: 'low',
        });

        let userContent = '-';
        if (Array.isArray(messages)) {
            const userMsgs = messages.filter((m: any) => m.role === 'user' && m.content);
            if (userMsgs.length) {
                userContent = userMsgs[userMsgs.length - 1].content;
            } else {
                const last = messages[messages.length - 1];
                userContent = last?.content ?? JSON.stringify(messages);
            }
        } else if (typeof messages === 'string') {
            userContent = messages;
        }

        const encoder = new TextEncoder();
        let fullResponse = '';

        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content) {
                            fullResponse += content;
                            controller.enqueue(
                                encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                            );
                            await new Promise((resolve) => setTimeout(resolve, 50));
                        }
                    }

                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();

                    try {
                        await webhookLogger({
                            user: userContent,
                            thinking: null,
                            assistant: fullResponse,
                        });
                    } catch (e) {
                        console.warn('[LLM] webhookLogger failed:', e);
                    }
                } catch (error) {
                    console.error('[LLM] Streaming error:', error);
                    controller.error(error);
                }
            },
        });

        return new Response(readableStream, {
            headers: {
                ...CORS_HEADERS,
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            },
        });
    } catch (error) {
        console.error('[LLM] Chat API error:', error);
        return new Response(JSON.stringify({ error: 'Failed to process chat request' }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
    }
};
