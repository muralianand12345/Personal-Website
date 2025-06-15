import axios from 'axios';
import { IChatHistory } from '@/types';

export const chatWithAPI = async (message: string, chatHistory: Array<IChatHistory> | null, top_chatHistory: number = 11): Promise<string> => {
	try {
		let trimmedHistory = chatHistory;
		if (chatHistory && chatHistory.length > top_chatHistory) {
			trimmedHistory = chatHistory.slice(-top_chatHistory);
		}

		// Updated API endpoint to match your FastAPI v1 routes
		const url = `${process.env.NEXT_PUBLIC_API_URL}/v1/chat/`;

		const response = await axios.post(
			url,
			{
				message: message,
				chat_history: trimmedHistory,
			},
			{
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_KEY}`,
				},
			}
		);

		return response.data.response;
	} catch (error) {
		console.error('Error calling chat API:', error);

		// Enhanced error handling
		if (axios.isAxiosError(error)) {
			if (error.response?.status === 401) {
				return 'Authentication failed. Please check your API configuration.';
			} else if (error.response?.status === 503) {
				return 'The AI service is temporarily unavailable. Please try again in a moment.';
			} else if (error.response?.status && error.response.status >= 500) {
				return 'Server error occurred. Please try again later.';
			}
		}

		return "I apologize, but I'm having trouble processing your request right now. Please try again later.";
	}
};
