from typing import List, Optional, Dict, Any

from api.models import ChatHistory
from api.services.llm_service import LLMService


class ChatService:
    """High-level chat service for LLM interactions."""

    def __init__(self, llm_service: LLMService):
        self.llm_service = llm_service

    async def process_chat(
        self, message: str, chat_history: Optional[List[ChatHistory]] = None, **kwargs
    ) -> Dict[str, Any]:
        """Process chat request."""
        # Generate response using LLM service
        result = await self.llm_service.generate_response(
            query=message, chat_history=chat_history, **kwargs
        )

        return {
            "response": result["content"],
            "usage": result["usage"],
            "metadata": {
                "model": self.llm_service.settings.model_name,
                "temperature": kwargs.get("temperature", self.llm_service.settings.temperature),
            },
        }