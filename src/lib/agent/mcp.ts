import { MCPAdapter } from '@langchain/mcp-adapters';
import type { DynamicStructuredTool } from '@langchain/core/tools';

import mcpConfig from '../../../mcp.config';

type RemoteServer = { url: string; headers?: Record<string, string> };
type LocalServer = { command: string; args?: string[]; env?: Record<string, string> };

export type McpServerConfig = (RemoteServer | LocalServer) & {
    /** Shown in the chat next to this server's tool calls. */
    label: string;
    /** What the server is for. It goes in the system prompt so the model knows when to use it. */
    description: string;
    /** Defaults to true. */
    enabled?: boolean;
    /** Tools to expose, without the server prefix. Leave it out to expose every tool. */
    tools?: string[];
};

export type McpConfig = {
    connectTimeoutMs: number;
    toolTimeoutMs: number;
    maxDescriptionChars: number;
    servers: Record<string, McpServerConfig>;
};

export type McpToolset = {
    /** The key in mcp.config.ts, which is also the tool-name prefix. */
    server: string;
    label: string;
    description: string;
    tools: DynamicStructuredTool[];
};

/** How long a server's tool list is reused before it is listed again. */
const TOOLS_TTL_MS = 10 * 60_000;
/** How long a server that failed to connect is skipped before it is tried again. */
const RETRY_AFTER_MS = 60_000;

/**
 * One adapter per server, kept for later requests on a warm instance. A shared adapter would
 * fail every server's discovery when any one of them is unreachable.
 */
const cache = new Map<
    string,
    { adapter?: MCPAdapter; expires: number; toolset: Promise<McpToolset | null> }
>();

const withTimeout = <T>(promise: Promise<T>, ms: number) =>
    new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
        promise.then(resolve, reject).finally(() => clearTimeout(timer));
    });

/** Cuts at a sentence end where one is close enough, so the model reads whole sentences. */
const shorten = (text: string, max: number) => {
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const sentenceEnd = cut.lastIndexOf('. ');
    return sentenceEnd > max / 2 ? cut.slice(0, sentenceEnd + 1) : `${cut.trimEnd()}…`;
};

const toConnection = (server: McpServerConfig) =>
    'url' in server
        ? { url: server.url, headers: server.headers }
        : { command: server.command, args: server.args ?? [], env: server.env };

const toToolset = (
    name: string,
    server: McpServerConfig,
    tools: DynamicStructuredTool[]
): McpToolset => {
    const prefix = `${name}__`;
    const allowed = server.tools && new Set(server.tools);
    const selected = tools.filter(
        (tool) => !allowed || allowed.has(tool.name.slice(prefix.length))
    );
    for (const tool of selected) {
        tool.description = shorten(tool.description, mcpConfig.maxDescriptionChars);
    }
    return { server: name, label: server.label, description: server.description, tools: selected };
};

const loadToolset = (name: string, server: McpServerConfig): Promise<McpToolset | null> => {
    const cached = cache.get(name);
    if (cached && cached.expires > Date.now()) return cached.toolset;

    const adapter =
        cached?.adapter ??
        new MCPAdapter({
            servers: { [name]: toConnection(server) },
            prefixToolNameWithServerName: true,
            defaultToolTimeout: mcpConfig.toolTimeoutMs,
        });

    const toolset = withTimeout(adapter.listTools(name), mcpConfig.connectTimeoutMs)
        .then((tools) => toToolset(name, server, tools))
        .catch((error) => {
            console.warn(
                `[MCP] Skipping "${name}":`,
                error instanceof Error ? error.message : error
            );
            adapter.close().catch(() => {});
            cache.set(name, {
                expires: Date.now() + RETRY_AFTER_MS,
                toolset: Promise.resolve(null),
            });
            return null;
        });

    cache.set(name, { adapter, expires: Date.now() + TOOLS_TTL_MS, toolset });
    return toolset;
};

/** Tools from every enabled server in mcp.config.ts. Servers that fail are skipped. */
export const loadMcpToolsets = async (): Promise<McpToolset[]> => {
    const servers: Record<string, McpServerConfig> = mcpConfig.servers;
    const toolsets = await Promise.all(
        Object.entries(servers)
            .filter(([, server]) => server.enabled !== false)
            .map(([name, server]) => loadToolset(name, server))
    );
    return toolsets.filter((toolset): toolset is McpToolset => !!toolset?.tools.length);
};
