from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any

from ..models.common import ChatHistory


class ChatRequest(BaseModel):
    """Chat request schema."""

    message: str = Field(..., min_length=1, max_length=4000, description="User message")
    chat_history: List[ChatHistory] = Field(default=[], description="Previous conversation history")
    temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=None, gt=0, le=4096)

    @validator("chat_history")
    def validate_chat_history(cls, v):
        if len(v) > 20:  # Limit history to prevent token overflow
            return v[-20:]
        return v


class ChatResponse(BaseModel):
    """Chat response schema."""

    response: str
    metadata: Optional[Dict[str, Any]] = None
    usage: Optional[Dict[str, int]] = None
