from typing import List, Optional, Dict, Any
from app.services.llm_service import LLMService
from app.services.vector_service import VectorService
from app.models.common import ChatHistory


class ChatService:
    """High-level chat service that orchestrates LLM and vector services."""

    def __init__(self, llm_service: LLMService, vector_service: VectorService):
        self.llm_service = llm_service
        self.vector_service = vector_service

    async def process_chat(
        self,
        message: str,
        chat_history: Optional[List[ChatHistory]] = None,
        use_rag: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """Process chat request with optional RAG."""
        context = None

        # Get context from vector database if RAG is enabled
        if use_rag:
            search_results = await self.vector_service.search_similar(
                query=message, limit=3, threshold=0.7
            )
            if search_results:
                context = "\n".join([doc["content"] for doc in search_results])

        # Generate response
        result = await self.llm_service.generate_response(
            query=message, chat_history=chat_history, context=context, **kwargs
        )

        return {
            "response": result["content"],
            "usage": result["usage"],
            "metadata": {
                "used_rag": use_rag,
                "context_docs": (
                    len(search_results) if use_rag and search_results else 0
                ),
            },
        }
