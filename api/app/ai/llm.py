import os
import re
from groq import Groq
from pydantic import SecretStr
from typing import List, Dict, Optional

from config import get_settings


class ChatGroq:
    def __init__(
        self,
        api_key: SecretStr,
        model_name: str = "deepseek-r1-distill-llama-70b",
        temperature: float = 0.7,
        max_tokens: int = 1000,
        top_p: float = 1,
        frequency_penalty: float = 0.0,
        presence_penalty: float = 0.0,
        stream: bool = False,
    ):
        """
        Initialize the ChatGroq client with configuration parameters.

        Args:
            api_key (SecretStr): The Groq API key
            model_name (str): Name of the model to use
            temperature (float): Controls randomness in responses
            max_tokens (int): Maximum tokens in the response
            top_p (float): Nucleus sampling parameter
            frequency_penalty (float): Penalty for frequent tokens
            presence_penalty (float): Penalty for repeated tokens
            stream (bool): Whether to stream responses
        """
        self.settings = get_settings()
        self.api_key = api_key.get_secret_value() or os.getenv("GROQ_API_KEY")
        self.model_name = model_name
        self.client = Groq(api_key=self.api_key)

        # Model parameters
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.top_p = top_p
        self.frequency_penalty = frequency_penalty
        self.presence_penalty = presence_penalty
        self.stream = stream

        # System message for the assistant
        self.system_message = self.settings.system_prompt

    def _format_chat_history(self, chat_history: List[str]) -> List[Dict[str, str]]:
        """
        Format chat history into the required message format.

        Args:
            chat_history (List[str]): List of alternating user and assistant messages

        Returns:
            List[Dict[str, str]]: Formatted message list
        """
        formatted_messages = []
        for i, message in enumerate(chat_history):
            role = "user" if i % 2 == 0 else "assistant"
            formatted_messages.append({"role": role, "content": message})
        return formatted_messages

    def _prepare_messages(
        self,
        query: str,
        chat_history: Optional[List[str]] = None,
        context: Optional[str] = None,
    ) -> List[Dict[str, str]]:
        """
        Prepare the messages list including system message, chat history, context, and current query.

        Args:
            query (str): Current user query
            chat_history (Optional[List[str]]): Previous conversation history
            context (Optional[str]): Additional context from RAG

        Returns:
            List[Dict[str, str]]: Prepared messages list
        """
        messages = [{"role": "system", "content": self.system_message}]

        # Add chat history if provided
        if chat_history:
            messages.extend(self._format_chat_history(chat_history))

        # Add RAG context if provided
        if context:
            messages.append(
                {
                    "role": "system",
                    "content": f"Additional context for the query: {context}",
                }
            )

        # Add current query
        messages.append({"role": "user", "content": query})

        return messages

    def _remove_thinking(self, response: str) -> str:
        """
        Remove the "Thinking..." message from the response.

        Args:
            response (str): Generated response

        Returns:
            str: Response without the "Thinking..." message
        """

        text = re.sub(r"<think>.*?</think>", "", response, flags=re.DOTALL)
        text = re.sub(r"<antThinking>.*?</antThinking>", "", text, flags=re.DOTALL)

        # Remove any remaining XML-like thinking tags
        text = re.sub(
            r"<\w*thinking\w*>.*?</\w*thinking\w*>",
            "",
            text,
            flags=re.DOTALL | re.IGNORECASE,
        )

        return text.strip()

    async def agenerate(
        self,
        query: str,
        chat_history: Optional[List[str]] = None,
        context: Optional[str] = None,
        **kwargs,
    ) -> Dict:
        """
        Asynchronously generate a response using the Groq API.

        Args:
            query (str): User query
            chat_history (Optional[List[str]]): Previous conversation history
            context (Optional[str]): Additional context from RAG
            **kwargs: Additional parameters to override defaults

        Returns:
            Dict: API response
        """
        messages = self._prepare_messages(query, chat_history, context)

        # Merge default parameters with any provided overrides
        params = {
            "model": self.model_name,
            "messages": messages,
            "temperature": kwargs.get("temperature", self.temperature),
            "max_tokens": kwargs.get("max_tokens", self.max_tokens),
            "top_p": kwargs.get("top_p", self.top_p),
            "frequency_penalty": kwargs.get(
                "frequency_penalty", self.frequency_penalty
            ),
            "presence_penalty": kwargs.get("presence_penalty", self.presence_penalty),
            "stream": kwargs.get("stream", self.stream),
        }

        completion = await self.client.achat.completions.create(**params)
        return completion

    def generate(
        self,
        query: str,
        chat_history: Optional[List[str]] = None,
        context: Optional[str] = None,
        **kwargs,
    ) -> Dict:
        """
        Synchronously generate a response using the Groq API.

        Args:
            query (str): User query
            chat_history (Optional[List[str]]): Previous conversation history
            context (Optional[str]): Additional context from RAG
            **kwargs: Additional parameters to override defaults

        Returns:
            Dict: API response
        """
        messages = self._prepare_messages(query, chat_history, context)

        # Merge default parameters with any provided overrides
        params = {
            "model": self.model_name,
            "messages": messages,
            "temperature": kwargs.get("temperature", self.temperature),
            "max_tokens": kwargs.get("max_tokens", self.max_tokens),
            "top_p": kwargs.get("top_p", self.top_p),
            "frequency_penalty": kwargs.get(
                "frequency_penalty", self.frequency_penalty
            ),
            "presence_penalty": kwargs.get("presence_penalty", self.presence_penalty),
            "stream": kwargs.get("stream", self.stream),
        }

        completion = self.client.chat.completions.create(**params)
        return completion

    def invoke(
        self,
        query: str,
        chat_history: Optional[List[str]] = None,
        context: Optional[str] = None,
        filter_thinking: bool = True,
        **kwargs,
    ) -> str:
        """
        Generate a response and return just the response text.

        Args:
            query (str): User query
            chat_history (Optional[List[str]]): Previous conversation history
            context (Optional[str]): Additional context from RAG
            **kwargs: Additional parameters to override defaults

        Returns:
            str: Generated response text
        """
        completion = self.generate(query, chat_history, context, **kwargs)
        result = completion.choices[0].message.content
        if filter_thinking:
            result = self._remove_thinking(result)
        return result
