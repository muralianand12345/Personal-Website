from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated

from api.app.schemas.chat import ChatRequest, ChatResponse
from api.app.services.chat_service import ChatService
from api.app.core.dependencies import get_chat_service
from api.app.core.auth import APIKeyDep
from api.app.core.exceptions import LLMServiceException


router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    chat_service: Annotated[ChatService, Depends(get_chat_service)],
    _: bool = APIKeyDep,  # API key authentication
):
    """Process chat message and return response."""
    try:
        result = await chat_service.process_chat(
            message=request.message,
            chat_history=request.chat_history,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )

        return ChatResponse(**result)

    except LLMServiceException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )
