import axios from "axios";
import { predefinedResponses } from "@/constants";
import { IChatHistory } from "@/types";
import { time, timeStamp } from "console";

export const chatWithAPI = async (
    message: string,
    chatHistory: Array<IChatHistory> | null,
    top_chatHistory: number = 5
): Promise<string> => {
    try {

        console.log(message);
        console.log(chatHistory);
        console.log(top_chatHistory);

        const lowerMessage = message.toLowerCase().trim();
        if (
            predefinedResponses[
                lowerMessage as keyof typeof predefinedResponses
            ]
        ) {
            return predefinedResponses[
                lowerMessage as keyof typeof predefinedResponses
            ];
        }

        if (chatHistory && chatHistory.length > top_chatHistory) {
            chatHistory = chatHistory.slice(-top_chatHistory);
        }

        console.log("chatHistory:", chatHistory);

        const response = await axios.post(
            "/api/chat",
            {
                message: message,
                chat_history: chatHistory,
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
