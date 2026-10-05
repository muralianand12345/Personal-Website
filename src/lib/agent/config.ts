/**
 * Settings for Leo's agent loop. MCP servers live in /mcp.config.ts.
 *
 * Budget note: the Groq free tier allows 8,000 tokens per minute per model, and every tool
 * round trip resends the system prompt, the tool schemas and the history (about 2,700 tokens).
 * Listing several models spreads the load: each has its own budget, so a rate-limited call
 * moves to the next one at once.
 */
const DEFAULT_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];

/** `CHAT_MODELS=model-a,model-b` in .env replaces the list. */
const modelsFromEnv = process.env.CHAT_MODELS?.split(',')
    .map((model) => model.trim())
    .filter(Boolean);

export const AGENT_CONFIG = {
    /**
     * OpenAI-compatible chat models, tried in order when one is rate limited. Both stream their
     * reasoning on Groq. qwen/qwen3.8-27b also works but is left out: when told to stop calling
     * tools it writes the tool call into its answer as text, which reaches the visitor.
     */
    models: modelsFromEnv?.length ? modelsFromEnv : DEFAULT_MODELS,
    /** How hard the model reasons before answering. The reasoning shows in the chat UI. */
    reasoningEffort: 'medium' as 'low' | 'medium' | 'high',
    temperature: 0.7,
    /** Reasoning and answer tokens combined, per model call. */
    maxTokens: 2048,
    /** Retries after a network error. Rate limits are handled by the model fallback. */
    maxRetries: 3,
    /** Most time one model call may spend waiting for rate limits. Then the reply fails politely. */
    maxRateLimitWaitMs: 30_000,

    /** Characters of recent conversation sent to the model. The latest question always goes. */
    historyChars: 6_000,
    /** Longer messages from the client are cut to this many characters. */
    maxMessageChars: 4_000,

    /** Tool calls allowed per reply. After that the model has to answer with what it has. */
    maxToolCalls: 5,
    /** A tool result is cut to this many characters before the model sees it. */
    maxToolResultChars: 3_000,
    /** A tool result is cut to this many characters before it is sent to the chat UI. */
    maxToolPreviewChars: 2_000,

    // Time limits per reply, counted from the question. They keep every reply inside the
    // route's 60s `maxDuration` (src/app/api/chat/route.ts); past that, Vercel cuts the stream.
    /** No tool calls after this. Tools still running are abandoned and Leo answers. */
    toolTimeLimitMs: 35_000,
    /** Rate-limit waits never run past this, so the final answer still has time to stream. */
    replyTimeLimitMs: 50_000,
};
