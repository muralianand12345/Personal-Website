import type { McpConfig } from '@/lib/agent/mcp';

/**
 * MCP servers that Leo, the site chatbot, can use as tools. Every one is free and works without
 * an API key. Exa, Context7 and Hugging Face accept an optional key from .env, which only raises
 * their rate limits.
 *
 * Each key becomes the tool-name prefix the model sees (`exa` -> `exa__web_search_exa`).
 *
 * - Remote servers (`url`) work everywhere, including on Vercel.
 * - Local servers (`command`) start a child process. They work in `next dev` only, because
 *   serverless functions cannot spawn long-lived processes.
 * - Every tool's schema is sent with every model call. The Groq free tier allows 8,000 tokens
 *   per minute per model, so list only the tools you need in `tools`, and leave a server off
 *   (`enabled: false`) until you want it.
 */

/** A header that is only sent when its value is configured. */
const withKey = (name: string, value: string | undefined) =>
    value ? { [name]: value } : undefined;

const mcpConfig = {
    /** Skip a server that takes longer than this to connect and list its tools. */
    connectTimeoutMs: 8_000,
    /** Abort a single MCP tool call after this long. */
    toolTimeoutMs: 30_000,
    /** Long tool descriptions are cut to this many characters to save prompt tokens. */
    maxDescriptionChars: 400,

    servers: {
        exa: {
            label: 'Exa',
            description: 'live web search, and reading the full text of any URL',
            url: 'https://mcp.exa.ai/mcp',
            headers: withKey('x-api-key', process.env.EXA_API_KEY),
            tools: ['web_search_exa', 'web_fetch_exa'],
        },
        deepwiki: {
            label: 'DeepWiki',
            description: 'questions about any public GitHub repository, answered from its code',
            url: 'https://mcp.deepwiki.com/mcp',
            tools: ['ask_wiki_question'],
        },
        context7: {
            label: 'Context7',
            description: 'up-to-date documentation and code examples for libraries and frameworks',
            url: 'https://mcp.context7.com/mcp',
            headers: withKey('CONTEXT7_API_KEY', process.env.CONTEXT7_API_KEY),
            tools: ['resolve-library-id', 'query-docs'],
        },
        huggingface: {
            label: 'Hugging Face',
            description: 'searching models, datasets and Spaces on the Hugging Face Hub',
            url: 'https://huggingface.co/mcp',
            headers: withKey(
                'Authorization',
                process.env.HF_TOKEN && `Bearer ${process.env.HF_TOKEN}`
            ),
            tools: ['hub_repo_search'],
        },
        wolfram: {
            label: 'Wolfram|Alpha',
            description:
                'computation and curated facts: maths, science, units, geography and dates',
            url: 'https://agenttools.wolfram.com/mcp',
            tools: ['WolframAlpha'],
        },

        // Off by default to keep the prompt small. Set `enabled: true` to turn one on.

        contextawesome: {
            enabled: true,
            label: 'Context Awesome',
            description: 'curated "awesome" lists of the best resources on a topic',
            url: 'https://www.context-awesome.com/api/mcp',
            tools: ['find_awesome_section', 'get_awesome_items'],
        },
        langchain: {
            enabled: true,
            label: 'LangChain Docs',
            description: 'official LangChain and LangGraph documentation',
            url: 'https://docs.langchain.com/mcp',
            tools: ['search_docs_by_lang_chain'],
        },
        awsknowledge: {
            enabled: true,
            label: 'AWS Knowledge',
            description: 'official AWS documentation and regional availability',
            url: 'https://knowledge-mcp.global.api.aws',
            tools: ['aws___search_documentation'],
        },
        cloudflare: {
            enabled: true,
            label: 'Cloudflare Docs',
            description: 'official Cloudflare documentation, including Workers and Workers AI',
            url: 'https://docs.mcp.cloudflare.com/mcp',
            tools: ['search_cloudflare_documentation'],
        },
        mslearn: {
            enabled: true,
            label: 'Microsoft Learn',
            description: 'official Microsoft and Azure documentation',
            url: 'https://learn.microsoft.com/api/mcp',
            tools: ['microsoft_docs_search', 'microsoft_docs_fetch'],
        },
    },
} satisfies McpConfig;

export default mcpConfig;
