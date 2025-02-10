import axios from "axios";
import { IChatHistory } from "@/types";

export const chatWithAPI = async (
    message: string,
    chatHistory: Array<IChatHistory> | null,
    top_chatHistory: number = 11
): Promise<string> => {
    try {
        let trimmedHistory = chatHistory;
        if (chatHistory && chatHistory.length > top_chatHistory) {
            trimmedHistory = chatHistory.slice(-top_chatHistory);
        }

        const url = "https://api.muralianand.in/api/chat";

        const response = await axios.post(
            url,
            {
                message: message,
                chat_history: trimmedHistory,
            },
            {
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data.response;
    } catch (error) {
        console.error("Error calling chat API:", error);
        return "I apologize, but I'm having trouble processing your request right now. Please try again later.";
    }
};
