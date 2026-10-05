export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    /** The reasoning and tool calls behind an assistant reply, in the order they happened. */
    steps?: ThinkingStep[];
    /** Time from sending the question to the last reasoning or tool event, in ms. */
    thinkingMs?: number;
    /** The reply ended in an error; `content` holds the message to show. */
    failed?: boolean;
    /** A passing note while thinking, such as a rate-limit wait. Cleared by the next event. */
    status?: string;
}

/** One step of an assistant reply's visible thinking. */
export type ThinkingStep =
    | { kind: 'reasoning'; text: string }
    | {
          kind: 'tool';
          id: string;
          name: string;
          /** The MCP server's label, or undefined for a built-in tool. */
          server?: string;
          input: unknown;
          output?: string;
          status: 'running' | 'done' | 'error';
      };

/** One server-sent event from /api/chat. */
export type ChatStreamEvent =
    | { type: 'reasoning'; delta: string }
    | { type: 'text'; delta: string }
    | { type: 'tool_start'; id: string; name: string; server?: string; input: unknown }
    | { type: 'tool_end'; id: string; output: string; isError: boolean }
    | { type: 'status'; message: string }
    | { type: 'error'; message: string }
    | { type: 'done' };

export interface ChatbotModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export type Post = {
    slug: string;
    title: string;
    excerpt?: string;
    coverImage?: any;
    coverImageUrl?: string | null;
    categories?: string[];
    publishedAt?: string;
    author?: string;
};

export interface ChatButtonPosition {
    x: number;
    y: number;
}

export interface ChatButtonDragState {
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
}
