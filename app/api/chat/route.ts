import { OpenAI } from 'openai';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
};

export async function OPTIONS(request: Request) {
    try {
        console.info('[LLM] /api/chat OPTIONS', {
            origin: request.headers.get('origin'),
            host: request.headers.get('host'),
            forwarded: request.headers.get('x-forwarded-host'),
        });
    } catch (e) {
        // ignore logging errors
    }

    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
    });
}

export async function POST(request: Request) {
    try {
        try {
            console.info('[LLM] /api/chat POST', {
                origin: request.headers.get('origin'),
                host: request.headers.get('host'),
                forwarded: request.headers.get('x-forwarded-host'),
                cfRay: request.headers.get('cf-ray'),
            });
        } catch (e) {}
        const { messages } = await request.json();

        if (!process.env.OPENAI_API_KEY) {
            return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
                status: 500,
                headers: CORS_HEADERS,
            });
        }

        const client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: process.env.OPENAI_BASE_URL,
        });

        const response = await client.chat.completions.create({
            model: 'openai/gpt-oss-20b',
            messages: messages,
            temperature: 0.7,
            max_tokens: 2000,
        });

        const assistantMessage = response.choices[0].message.content;

        return new Response(JSON.stringify({ message: assistantMessage }), {
            status: 200,
            headers: CORS_HEADERS,
        });
    } catch (error) {
        console.error('[LLM] Chat API error:', error);
        return new Response(JSON.stringify({ error: 'Failed to process chat request' }), {
            status: 500,
            headers: CORS_HEADERS,
        });
    }
}
