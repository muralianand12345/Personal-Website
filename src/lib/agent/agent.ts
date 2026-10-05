import { AIMessageChunk, ToolMessage, createAgent } from 'langchain';
import type { StreamEvent } from '@langchain/core/tracers/log_stream';

import {
    RATE_LIMIT_EVENT,
    capToolResults,
    contentText,
    modelFallback,
    toolBudget,
    truncate,
} from '@/lib/agent/middleware';
import type { ChatStreamEvent } from '@/types';
import { AGENT_CONFIG } from '@/lib/agent/config';
import { BUILTIN_TOOLS } from '@/lib/agent/tools';
import { createChatModel } from '@/lib/agent/model';
import { loadMcpToolsets } from '@/lib/agent/mcp';
import { buildSystemPrompt } from '@/lib/agent/prompt';

export type AgentMessage = { role: 'user' | 'assistant'; content: string };

const NO_ANSWER = "Sorry, I couldn't put an answer together that time. Could you try asking again?";

/** How a tool is shown in the chat: its unprefixed name, and the MCP server it came from. */
type ToolLabel = { name: string; server?: string };

/** The newest messages that fit the history budget. The latest question is always kept. */
const recentHistory = (messages: AgentMessage[]) => {
    const kept: AgentMessage[] = [];
    let budget = AGENT_CONFIG.historyChars;
    for (const message of [...messages].reverse()) {
        if (kept.length && message.content.length > budget) break;
        kept.unshift(message);
        budget -= message.content.length;
    }
    return kept;
};

const toChatEvents = (event: StreamEvent, labels: Map<string, ToolLabel>): ChatStreamEvent[] => {
    switch (event.event) {
        case 'on_chat_model_stream': {
            const chunk = event.data.chunk as AIMessageChunk;
            const reasoning = chunk.additional_kwargs?.reasoning_content;
            const events: ChatStreamEvent[] = [];
            if (typeof reasoning === 'string' && reasoning)
                events.push({ type: 'reasoning', delta: reasoning });
            if (chunk.text) events.push({ type: 'text', delta: chunk.text });
            return events;
        }
        case 'on_tool_start':
            return [
                {
                    type: 'tool_start',
                    id: event.run_id,
                    ...(labels.get(event.name) ?? { name: event.name }),
                    input: event.data.input,
                },
            ];
        case 'on_tool_end': {
            const output = event.data.output;
            const isMessage = output instanceof ToolMessage;
            return [
                {
                    type: 'tool_end',
                    id: event.run_id,
                    output: truncate(
                        contentText(isMessage ? output.content : output),
                        AGENT_CONFIG.maxToolPreviewChars
                    ),
                    isError: isMessage && output.status === 'error',
                },
            ];
        }
        case 'on_tool_error':
            return [
                {
                    type: 'tool_end',
                    id: event.run_id,
                    output: String(event.data.error),
                    isError: true,
                },
            ];
        case 'on_custom_event': {
            if (event.name !== RATE_LIMIT_EVENT) return [];
            const seconds = Math.ceil((event.data as { waitMs: number }).waitMs / 1000);
            return [{ type: 'status', message: `Rate limit reached, retrying in ${seconds}s…` }];
        }
        default:
            return [];
    }
};

/**
 * Runs Leo over the conversation, yielding what the chat shows as it happens: reasoning, tool
 * calls and the answer text. Errors are thrown to the caller.
 */
export async function* streamAgentReply(
    messages: AgentMessage[],
    signal: AbortSignal
): AsyncGenerator<ChatStreamEvent> {
    const startedAt = Date.now();
    const toolsets = await loadMcpToolsets();

    const labels = new Map<string, ToolLabel>(
        BUILTIN_TOOLS.map((tool) => [tool.name, { name: tool.name }])
    );
    for (const { server, label, tools } of toolsets) {
        for (const tool of tools) {
            labels.set(tool.name, { name: tool.name.slice(`${server}__`.length), server: label });
        }
    }

    const models = AGENT_CONFIG.models.map(createChatModel);
    const agent = createAgent({
        model: models[0],
        tools: [...BUILTIN_TOOLS, ...toolsets.flatMap((toolset) => toolset.tools)],
        systemPrompt: buildSystemPrompt(toolsets),
        middleware: [toolBudget(startedAt), capToolResults, modelFallback(models, startedAt)],
    });

    const events = agent.streamEvents(
        { messages: recentHistory(messages) },
        { version: 'v2', signal, recursionLimit: 25 }
    );

    let answered = false;
    for await (const event of events) {
        for (const chatEvent of toChatEvents(event, labels)) {
            answered ||= chatEvent.type === 'text';
            yield chatEvent;
        }
    }

    // A model can occasionally finish on reasoning alone; never leave the reply blank.
    if (!answered && !signal.aborted) yield { type: 'text', delta: NO_ANSWER };
}
