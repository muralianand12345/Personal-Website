export const chatWithAPI = async (
  message: string,
  chatHistory: { role: string; content: string }[]
) => {
  const API_URL = "https://ticket.iconicrp.in/api/v1/ai/chat";
  const API_KEY = process.env.API_KEY as string;

  return "";
};
