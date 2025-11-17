export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
}

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
