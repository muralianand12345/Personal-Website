from functools import lru_cache
from fastapi import Depends
from typing import Annotated

from app.core.config import Settings, get_settings
from app.services.llm_service import LLMService
from app.services.vector_service import VectorService
from app.services.chat_service import ChatService


@lru_cache()
def get_llm_service(settings: Annotated[Settings, Depends(get_settings)]) -> LLMService:
    """Get LLM service instance."""
    return LLMService(settings)


@lru_cache()
def get_vector_service(
    settings: Annotated[Settings, Depends(get_settings)],
) -> VectorService:
    """Get Vector service instance."""
    return VectorService(settings)


def get_chat_service(
    llm_service: Annotated[LLMService, Depends(get_llm_service)],
    vector_service: Annotated[VectorService, Depends(get_vector_service)],
) -> ChatService:
    """Get Chat service instance."""
    return ChatService(llm_service, vector_service)
