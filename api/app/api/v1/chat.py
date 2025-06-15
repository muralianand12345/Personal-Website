from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import ChatService
from app.core.dependencies import get_chat_service
from app.core.exceptions import LLMServiceException, VectorDBException


router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    chat_service: Annotated[ChatService, Depends(get_chat_service)],
):
    """Process chat message and return response."""
    try:
        result = await chat_service.process_chat(
            message=request.message,
            chat_history=request.chat_history,
            use_rag=request.use_rag,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )

        return ChatResponse(**result)

    except (LLMServiceException, VectorDBException) as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )
