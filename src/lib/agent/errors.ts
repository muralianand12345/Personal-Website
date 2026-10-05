type ErrorLike = {
    name?: string;
    status?: number;
    code?: string;
    headers?: Headers;
    cause?: unknown;
};

/** The error and its causes. LangChain wraps model errors raised inside middleware. */
const errorChain = (error: unknown): ErrorLike[] => {
    const chain: ErrorLike[] = [];
    let current = error;
    while (current && typeof current === 'object' && chain.length < 5) {
        chain.push(current as ErrorLike);
        current = (current as ErrorLike).cause;
    }
    return chain;
};

/** How long the provider asks us to wait after a 429, or null for any other error. */
export const retryAfterMs = (error: unknown): number | null => {
    const limited = errorChain(error).find((e) => e.status === 429);
    const seconds = Number(limited?.headers?.get?.('retry-after'));
    return limited && Number.isFinite(seconds) ? seconds * 1000 : null;
};

/** Groq's codes for a reply it could not parse, such as a malformed or unknown tool call. */
const MODEL_FUMBLES = new Set(['tool_use_failed', 'output_parse_failed']);

/**
 * Groq rejects a reply in which gpt-oss emits a malformed or unknown tool call. It is a model
 * glitch rather than a real failure, and another model usually gets the same request right.
 */
export const isToolUseFailure = (error: unknown) =>
    errorChain(error).some((e) => e.code !== undefined && MODEL_FUMBLES.has(e.code));

/** What to tell the visitor when a reply fails. The details stay in the server log. */
export const describeAgentError = (error: unknown) => {
    const chain = errorChain(error);
    if (chain.some((e) => e.status === 429 || e.status === 413)) {
        return "I'm getting more questions than I can handle right now. Please try again in a minute.";
    }
    if (chain.some((e) => e.name === 'GraphRecursionError')) {
        return 'That took more steps than I am allowed. Could you ask something narrower?';
    }
    return 'Sorry, I ran into an error. Please try again.';
};
