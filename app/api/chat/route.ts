import { OpenAI } from 'openai';

export async function POST(request: Request) {
    try {
        const { messages } = await request.json();

        if (!process.env.OPENAI_API_KEY) {
            return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
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
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('[v0] Chat API error:', error);
        return new Response(JSON.stringify({ error: 'Failed to process chat request' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
