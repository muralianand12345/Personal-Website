from fastapi import Depends
from typing import Annotated

from app.core.config import Settings, get_settings
from app.services import LLMService, ChatService


def get_llm_service(settings: Annotated[Settings, Depends(get_settings)]) -> LLMService:
    """Get LLM service instance."""
    return LLMService(settings)


def get_chat_service(
    llm_service: Annotated[LLMService, Depends(get_llm_service)],
) -> ChatService:
    """Get Chat service instance."""
    return ChatService(llm_service)
