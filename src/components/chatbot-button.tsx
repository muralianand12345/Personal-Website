'use client';

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';

import ChatbotModal from './chatbot-modal';

const ChatbotButton = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button onClick={() => setIsOpen(true)} className="fixed bottom-8 right-8 z-40 w-14 h-14 rounded-full bg-white text-black shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center border-2 border-gray-700" aria-label="Open AI Assistant">
                <MessageCircle size={24} />
            </button>
            <ChatbotModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
};

export default ChatbotButton;
