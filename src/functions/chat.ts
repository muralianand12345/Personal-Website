import { predefinedResponses } from '@/constants';

export const chatWithAPI = async (
    message: string,
    chatHistory: string[]
): Promise<string> => {
    try {
        const lowerMessage = message.toLowerCase().trim();
        if (predefinedResponses[lowerMessage as keyof typeof predefinedResponses]) {
            return predefinedResponses[lowerMessage as keyof typeof predefinedResponses];
        }

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                chat_history: chatHistory
            }),
        });

        if (!response.ok) {
            throw new Error('API response was not ok');
        }

        const data = await response.json();
        return data.response;

    } catch (error) {
        console.error('Error calling chat API:', error);
        return "I apologize, but I'm having trouble processing your request right now. Please try again later.";
    }
};