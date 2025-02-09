import { predefinedResponses } from '@/constants';

// Mock responses for testing without an actual API
const mockResponses = {
    greeting: [
        "Hello! How can I help you today?",
        "Hi there! What would you like to know?",
        "Greetings! How may I assist you?",
    ],
    farewell: [
        "Goodbye! Have a great day!",
        "See you later! Take care!",
        "Bye! Feel free to come back if you have more questions!",
    ],
    unknown: [
        "I'm not sure I understand. Could you please rephrase that?",
        "Interesting question! Could you provide more details?",
        "I'm still learning. Could you elaborate on that?",
    ],
    technology: [
        "I specialize in web development, particularly with React and Next.js.",
        "I have experience with various programming languages and frameworks.",
        "I enjoy working with modern web technologies and cloud platforms.",
    ],
};

// Helper function to get a random response from an array
const getRandomResponse = (responses: string[]) => {
    const index = Math.floor(Math.random() * responses.length);
    return responses[index];
};

// Helper function to detect response type based on message content
const detectResponseType = (message: string): keyof typeof mockResponses => {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.match(/^(hi|hello|hey|greetings)/)) {
        return 'greeting';
    }
    if (lowerMessage.match(/^(bye|goodbye|see you|farewell)/)) {
        return 'farewell';
    }
    if (lowerMessage.match(/(tech|programming|coding|developer)/)) {
        return 'technology';
    }
    return 'unknown';
};

export const chatWithAPI = async (
    message: string,
    chatHistory: string[]
): Promise<string> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if message matches any predefined responses
    const lowerMessage = message.toLowerCase().trim();
    if (predefinedResponses[lowerMessage as keyof typeof predefinedResponses]) {
        return predefinedResponses[lowerMessage as keyof typeof predefinedResponses];
    }

    // Get appropriate response type and return random response
    const responseType = detectResponseType(message);
    return getRandomResponse(mockResponses[responseType]);
};