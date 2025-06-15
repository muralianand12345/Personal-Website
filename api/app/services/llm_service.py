import os
import asyncio
from typing import List, Dict, Optional, Any
from groq import Groq

from api.app.core.config import Settings
from api.app.core.exceptions import LLMServiceException
from api.app.models.common import ChatHistory
from api.app.utils.text_processing import remove_thinking_tags


class LLMService:
    """Service for LLM interactions."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self._client = None
        self._system_prompt = self._load_system_prompt()

    @property
    def client(self) -> Groq:
        """Lazy initialization of Groq client."""
        if self._client is None:
            if not self.settings.groq_api_key:
                raise LLMServiceException("GROQ_API_KEY is not configured")
            self._client = Groq(api_key=self.settings.groq_api_key)
        return self._client

    def _load_system_prompt(self) -> str:
        """Load system prompt from file or return default."""
        try:
            prompt_path = self.settings.system_prompt_file
            if os.path.exists(prompt_path):
                with open(prompt_path, "r", encoding="utf-8") as f:
                    return f.read().strip()
        except Exception:
            pass

        # Default prompt if file doesn't exist
        return """You are Leo, a professional personal assistant for Murali Anand, a software engineer. 
        Provide clear, accurate technical guidance while maintaining a professional and helpful demeanor."""

    def _prepare_messages(
        self,
        query: str,
        chat_history: Optional[List[ChatHistory]] = None,
    ) -> List[Dict[str, str]]:
        """Prepare messages for the API."""
        messages = [{"role": "system", "content": self._system_prompt}]

        # Add chat history
        if chat_history:
            for msg in chat_history:
                messages.append({"role": msg.role, "content": msg.content})

        # Add current query
        messages.append({"role": "user", "content": query})

        return messages

    async def generate_response(
        self,
        query: str,
        chat_history: Optional[List[ChatHistory]] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        """Generate response using LLM."""
        try:
            messages = self._prepare_messages(query, chat_history)

            params = {
                "model": self.settings.model_name,
                "messages": messages,
                "temperature": kwargs.get("temperature", self.settings.temperature),
            }

            # Add optional parameters
            if self.settings.max_tokens:
                params["max_tokens"] = kwargs.get("max_tokens", self.settings.max_tokens)
            if self.settings.top_p:
                params["top_p"] = self.settings.top_p

            # Use asyncio for non-blocking call
            completion = await asyncio.get_event_loop().run_in_executor(
                None, lambda: self.client.chat.completions.create(**params)
            )

            content = completion.choices[0].message.content
            cleaned_content = remove_thinking_tags(content)

            return {
                "content": cleaned_content,
                "usage": {
                    "prompt_tokens": completion.usage.prompt_tokens,
                    "completion_tokens": completion.usage.completion_tokens,
                    "total_tokens": completion.usage.total_tokens,
                },
            }

        except Exception as e:
            raise LLMServiceException(f"Failed to generate response: {str(e)}")
