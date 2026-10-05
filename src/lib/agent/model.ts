import { ChatOpenAICompletions } from '@langchain/openai';

import { AGENT_CONFIG } from '@/lib/agent/config';

/**
 * Groq streams gpt-oss reasoning as `delta.reasoning`, but LangChain only reads
 * `delta.reasoning_content` (the DeepSeek convention). Copying it across puts the reasoning in
 * `additional_kwargs.reasoning_content`, where the agent stream picks it up.
 *
 * LangChain never sends reasoning back to the provider, so follow-up tool turns are unaffected.
 * If a later @langchain/openai drops this hook, replies still work; only the reasoning stops
 * showing in the chat.
 */
class ReasoningChatModel extends ChatOpenAICompletions {
    protected override _convertCompletionsDeltaToBaseMessageChunk(
        ...args: Parameters<ChatOpenAICompletions['_convertCompletionsDeltaToBaseMessageChunk']>
    ) {
        const chunk = super._convertCompletionsDeltaToBaseMessageChunk(...args);
        const reasoning = args[0].reasoning;
        if (typeof reasoning === 'string' && reasoning) {
            chunk.additional_kwargs.reasoning_content = reasoning;
        }
        return chunk;
    }
}

export type ChatModel = ReasoningChatModel;

export const createChatModel = (model: string): ChatModel =>
    new ReasoningChatModel({
        model,
        apiKey: process.env.OPENAI_API_KEY,
        configuration: { baseURL: process.env.OPENAI_BASE_URL },
        temperature: AGENT_CONFIG.temperature,
        maxTokens: AGENT_CONFIG.maxTokens,
        maxRetries: AGENT_CONFIG.maxRetries,
        reasoning: { effort: AGENT_CONFIG.reasoningEffort },
        streaming: true,
    });
