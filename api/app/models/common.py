from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum


class MessageRole(str, Enum):
    """Message role enumeration."""

    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class BaseMessage(BaseModel):
    """Base message model."""

    role: MessageRole
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[Dict[str, Any]] = None


class ChatHistory(BaseModel):
    """Chat history model."""

    role: MessageRole
    content: str
    timestamp: str
