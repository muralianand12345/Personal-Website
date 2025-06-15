import axios from 'axios';
import { IChatHistory } from '@/types';

export const chatWithAPI = async (message: string, chatHistory: Array<IChatHistory> | null, top_chatHistory: number = 11): Promise<string> => {
	try {
		let trimmedHistory = chatHistory;
		if (chatHistory && chatHistory.length > top_chatHistory) {
			trimmedHistory = chatHistory.slice(-top_chatHistory);
		}

		// Build the API URL
		const baseUrl = 'https://api.muralianand.in/api';
		const url = `${baseUrl}/v1/chat/`;
		const apiKey = process.env.NEXT_PUBLIC_API_KEY;

		if (!apiKey) {
			throw new Error('API key not configured');
		}

		const response = await axios.post(
			url,
			{
				message: message,
				chat_history: trimmedHistory || [],
			},
			{
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${apiKey}`,
				},
				timeout: 30000, // 30 second timeout
			}
		);

		console.log('API Response:', response.data);
		return response.data.response;
	} catch (error) {
		console.error('Error calling chat API:', error);

		if (axios.isAxiosError(error)) {
			const status = error.response?.status;
			const errorData = error.response?.data;

			console.error('Error details:', {
				status,
				data: errorData,
				url: error.config?.url,
			});

			switch (status) {
				case 401:
					return 'Authentication failed. Please check your API key configuration.';
				case 404:
					return 'API endpoint not found. Please check if the backend server is running on the correct port.';
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
