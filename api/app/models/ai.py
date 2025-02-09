from pydantic import BaseModel
from typing import Optional


class BaseMessage(BaseModel):
    role: str
    content: str
    name: Optional[str] = None
