import axios from 'axios';
import { IChatHistory } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || (process.env.NODE_ENV === 'production' ? 'https://api.muralianand.in/api' : 'http://localhost:8001/api');

export const chatWithAPI = async (message: string, chatHistory: Array<IChatHistory> | null, top_chatHistory: number = 11): Promise<string> => {
	try {
		let trimmedHistory = chatHistory;
		if (chatHistory && chatHistory.length > top_chatHistory) {
			trimmedHistory = chatHistory.slice(-top_chatHistory);
		}

		const url = `${API_BASE_URL}/v1/chat/`;
		const apiKey = process.env.NEXT_PUBLIC_API_KEY;

		if (!apiKey) {
			throw new Error('API key not configured. Please set NEXT_PUBLIC_API_KEY in your environment variables');
		}

		console.log('Making request to:', url);

		const response = await axios.post(
			url,
			{
				message: message,
				chat_history: trimmedHistory || [],
				temperature: 0.7,
				max_tokens: 1000,
			},
			{
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${apiKey}`,
				},
				timeout: 30000,
			}
		);

		return response.data.response;
	} catch (error) {
		console.error('Error calling chat API:', error);

		if (axios.isAxiosError(error)) {
			const status = error.response?.status;

			switch (status) {
				case 401:
					return 'Authentication failed. Please check your API key configuration.';
				case 404:
					return 'API endpoint not found. Please check if the backend server is running.';
				case 422:
					return 'Invalid request format. Please try again.';
				case 503:
					return 'The AI service is temporarily unavailable. Please try again in a moment.';
				case 500:
					return 'Server error occurred. Please try again later.';
				default:
					if (status && status >= 400) {
						return `Request failed with status ${status}. Please try again.`;
					}
			}

			if (error.code === 'ECONNREFUSED') {
				return 'Cannot connect to the server. Please make sure the backend is running.';
			}

			if (error.code === 'TIMEOUT') {
				return 'Request timed out. Please try again.';
			}
		}

		return "I apologize, but I'm having trouble processing your request right now. Please try again later.";
	}
};
