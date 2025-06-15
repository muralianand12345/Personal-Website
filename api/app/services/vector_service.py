import asyncio
from typing import List, Dict, Optional, Tuple
from app.core.config import Settings
from app.core.exceptions import VectorDBException
from app.ai.vectordb import VectorDatabase


class VectorService:
    """Service for vector database operations."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self._db = None

    @property
    def db(self) -> VectorDatabase:
        """Lazy initialization of vector database."""
        if self._db is None:
            try:
                self._db = VectorDatabase(
                    db_name=self.settings.db_name,
                    db_user=self.settings.db_user,
                    db_password=self.settings.db_password,
                    db_host=self.settings.db_host,
                    db_port=self.settings.db_port,
                    model_name=self.settings.embedding_model,
                    vector_dim=self.settings.vector_dimension,
                )
            except Exception as e:
                raise VectorDBException(
                    f"Failed to initialize vector database: {str(e)}"
                )
        return self._db

    async def search_similar(
        self, query: str, limit: int = 5, threshold: float = 0.7
    ) -> List[Dict]:
        """Search for similar documents."""
        try:
            # Run in executor to avoid blocking
            results = await asyncio.get_event_loop().run_in_executor(
                None, self.db.search_similar, query, limit, threshold
            )
            return results
        except Exception as e:
            raise VectorDBException(f"Search failed: {str(e)}")

    async def add_documents(self, documents: List[Dict[str, str]]) -> Tuple[int, int]:
        """Add documents to the database."""
        try:
            return await asyncio.get_event_loop().run_in_executor(
                None, self.db.load_documents, documents
            )
        except Exception as e:
            raise VectorDBException(f"Failed to add documents: {str(e)}")
