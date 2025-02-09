from pydantic import SecretStr
from models.chat import ChatRequest, ChatResponse
from fastapi import APIRouter, HTTPException, Depends

from config import Settings, get_settings
from ai.llm import ChatGroq

router = APIRouter()


def get_chat_client(settings: Settings = Depends(get_settings)) -> ChatGroq:
    """
    Create and return a ChatGroq client instance.
    Using Depends for dependency injection and potential reuse.
    """
    if not settings.groq_api_key:
        raise HTTPException(
            status_code=500, detail="GROQ_API_KEY is not set in environment variables"
        )

    return ChatGroq(
        api_key=SecretStr(settings.groq_api_key),
        model_name=settings.model_name,
        temperature=settings.temperature,
        max_tokens=settings.max_tokens,
        top_p=settings.top_p,
    )


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest, chat_client: ChatGroq = Depends(get_chat_client)
):
    """
    Chat endpoint that processes messages and returns responses.
    """
    try:
        response = chat_client.invoke(
            query=request.message, chat_history=request.chat_history
        )
        return ChatResponse(response=response)

    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(
            status_code=500, detail="An error occurred while processing your request"
        )
