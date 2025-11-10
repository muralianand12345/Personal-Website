export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ChatbotModalProps {
    isOpen: boolean;
    onClose: () => void;
}
