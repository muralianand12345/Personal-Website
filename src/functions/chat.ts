import axios from 'axios';
import { IChatHistory } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || (process.env.NODE_ENV === 'production' ? 'https://api.muralianand.in/api' : 'http://localhost:8001/api');

// Test function to check API connectivity
export const testAPIConnection = async (): Promise<{ success: boolean; message: string; details?: any }> => {
	try {
		const healthUrl = `${API_BASE_URL}/v1/health/`;
		console.log('Testing API connection to:', healthUrl);

		const response = await axios.get(healthUrl, {
			timeout: 10000,
			headers: {
				Accept: 'application/json',
			},
		});

		return {
			success: true,
			message: 'API connection successful',
			details: response.data,
		};
	} catch (error) {
		console.error('API connection test failed:', error);

		if (axios.isAxiosError(error)) {
			const status = error.response?.status;
			const errorCode = error.code;

			return {
				success: false,
				message: `API connection failed: ${errorCode || status || 'Unknown error'}`,
				details: {
					status,
					errorCode,
					message: error.message,
					response: error.response?.data,
				},
			};
		}

		return {
			success: false,
			message: 'API connection failed with unknown error',
			details: error,
		};
	}
};

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

		console.log('Making chat request to:', url);
		console.log('Request payload:', {
			message: message.substring(0, 50) + '...',
			historyLength: trimmedHistory?.length || 0,
		});

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
					Accept: 'application/json',
				},
				timeout: 30000,
				// Add withCredentials for CORS
				withCredentials: false,
			}
		);

		console.log('Chat API response received:', response.status);
		return response.data.response;
	} catch (error) {
		console.error('Error calling chat API:', error);

		if (axios.isAxiosError(error)) {
			const status = error.response?.status;
			const errorCode = error.code;

			// CORS-specific error handling
			if (errorCode === 'ERR_NETWORK' || errorCode === 'ERR_CORS') {
				console.error('CORS or network error detected. Testing API connection...');
				const connectionTest = await testAPIConnection();

				if (!connectionTest.success) {
					return `Connection failed: ${connectionTest.message}. Please ensure the backend server is running and CORS is properly configured.`;
				}

				return 'CORS error: The frontend cannot connect to the API due to cross-origin restrictions. Please check the server CORS configuration.';
			}

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

			if (errorCode === 'ECONNREFUSED') {
				return 'Cannot connect to the server. Please make sure the backend is running at the correct URL.';
			}

			if (errorCode === 'TIMEOUT' || errorCode === 'ECONNABORTED') {
				return 'Request timed out. Please try again.';
			}

			// Generic axios error
			return `Network error (${errorCode || status}): Please check your connection and try again.`;
		}

		return "I apologize, but I'm having trouble processing your request right now. Please try again later.";
	}
};
