from pydantic import BaseModel
from typing import List


class BaseChatRequest(BaseModel):
    message: str
    chat_history: List[str] = []


class BaseChatResponse(BaseModel):
    response: str

    class Config:
        json_schema_extra = {
            "example": {"response": "Hello! How can I help you today?"}
        }
