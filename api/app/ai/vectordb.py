import json
import torch
import psycopg2
import numpy as np
from contextlib import contextmanager
from psycopg2.extras import execute_values
from typing import List, Dict, Optional, Tuple
from transformers import AutoTokenizer, AutoModel


class VectorDatabase:
    def __init__(
        self,
        db_name: str,
        db_user: str,
        db_password: str,
        db_host: str = "localhost",
        db_port: int = 5432,
        model_name: str = "sentence-transformers/all-MiniLM-L6-v2",
        table_name: str = "documents",
        vector_dim: int = 384,
    ):
        self.conn_params = {
            "dbname": db_name,
            "user": db_user,
            "password": db_password,
            "host": db_host,
            "port": db_port,
        }
        self.table_name = table_name
        self.vector_dim = vector_dim

        # Initialize model and tokenizer with better error handling
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModel.from_pretrained(model_name)
            self.model.eval()
        except Exception as e:
            raise RuntimeError(f"Failed to initialize model: {str(e)}")

        # Initialize database
        self._initialize_db()

    @contextmanager
    def _get_connection(self):
        """Context manager for database connections"""
        conn = psycopg2.connect(**self.conn_params)
        try:
            yield conn
        finally:
            conn.close()

    def _initialize_db(self) -> None:
        """Initialize database with required extensions and tables"""
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                # Create extension and table in a single transaction
                cur.execute(
                    """
                    CREATE EXTENSION IF NOT EXISTS vector;
                    
                    CREATE TABLE IF NOT EXISTS {} (
                        id SERIAL PRIMARY KEY,
                        content TEXT NOT NULL,
                        metadata JSONB,
                        embedding vector({}),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE INDEX IF NOT EXISTS embedding_idx 
                    ON {} 
                    USING ivfflat (embedding vector_cosine_ops)
                    WITH (lists = 100);
                """.format(self.table_name, self.vector_dim, self.table_name)
                )

    @torch.no_grad()
    def _get_embedding(self, text: str) -> np.ndarray:
        """Generate embedding for text using batched processing"""
        inputs = self.tokenizer(
            text, return_tensors="pt", padding=True, truncation=True, max_length=512
        )
        outputs = self.model(**inputs)
        return outputs.last_hidden_state.mean(dim=1)[0].numpy()

    def _batch_get_embeddings(
        self, texts: List[str], batch_size: int = 32
    ) -> List[np.ndarray]:
        """Process embeddings in batches for better performance"""
        embeddings = []
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i : i + batch_size]
            batch_inputs = self.tokenizer(
                batch_texts,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=512,
            )
            with torch.no_grad():
                outputs = self.model(**batch_inputs)
            batch_embeddings = outputs.last_hidden_state.mean(dim=1).numpy()
            embeddings.extend(batch_embeddings)
        return embeddings

    def load_documents(
        self, documents: List[Dict[str, str]], batch_size: int = 100
    ) -> Tuple[int, int]:
        """
        Load documents in batches and return success count
        Returns: Tuple of (success_count, total_count)
        """
        success_count = 0
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                for i in range(0, len(documents), batch_size):
                    batch = documents[i : i + batch_size]

                    # Get embeddings for the batch
                    contents = [doc["content"] for doc in batch]
                    embeddings = self._batch_get_embeddings(contents)

                    # Prepare values for insertion
                    values = [
                        (
                            doc["content"],
                            json.dumps(doc.get("metadata", {})),
                            embedding.tolist(),
                        )
                        for doc, embedding in zip(batch, embeddings)
                    ]

                    try:
                        execute_values(
                            cur,
                            f"""
                            INSERT INTO {self.table_name} 
                            (content, metadata, embedding)
                            VALUES %s
                            """,
                            values,
                            template="(%s, %s::jsonb, %s::vector)",
                        )
                        success_count += len(batch)
                    except Exception:
                        conn.rollback()
                        continue

        return success_count, len(documents)

    def search_similar(
        self,
        query: str,
        limit: int = 5,
        threshold: float = 0.7,
        metadata_filters: Optional[Dict] = None,
    ) -> List[Dict]:
        """Enhanced similarity search with better query construction"""
        query_embedding = self._get_embedding(query)

        base_query = f"""
            WITH similarity_results AS (
                SELECT 
                    id,
                    content,
                    metadata,
                    1 - (embedding <=> %s::vector) as similarity
                FROM {self.table_name}
                WHERE 1 - (embedding <=> %s::vector) > %s
                {self._build_metadata_filter(metadata_filters) if metadata_filters else ""}
            )
            SELECT *
            FROM similarity_results
            ORDER BY similarity DESC
            LIMIT %s
        """

        params = [query_embedding.tolist(), query_embedding.tolist(), threshold, limit]
        if metadata_filters:
            params.extend(metadata_filters.values())

        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(base_query, params)
                return [
                    {
                        "id": row[0],
                        "content": row[1],
                        "metadata": row[2],
                        "similarity": row[3],
                    }
                    for row in cur.fetchall()
                ]

    def _build_metadata_filter(self, filters: Dict) -> str:
        """Helper method to build metadata filter conditions"""
        if not filters:
            return ""
        conditions = [f"metadata->>'{key}' = %s" for key in filters.keys()]
        return "AND " + " AND ".join(conditions)

    def delete_documents(self, filter_criteria: Dict) -> int:
        """Delete documents with optimized query"""
        delete_query = f"""
            DELETE FROM {self.table_name}
            WHERE {self._build_metadata_filter(filter_criteria)[4:]}
            RETURNING id
        """

        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(delete_query, list(filter_criteria.values()))
                return len(cur.fetchall())

    def update_document(
        self, document_id: int, content: str, metadata: Optional[Dict] = None
    ) -> bool:
        """Update document with better error handling"""
        new_embedding = self._get_embedding(content)

        update_query = f"""
            UPDATE {self.table_name}
            SET 
                content = %s,
                embedding = %s::vector
                {", metadata = %s::jsonb" if metadata else ""}
            WHERE id = %s
        """

        params = [content, new_embedding.tolist()]
        if metadata:
            params.append(json.dumps(metadata))
        params.append(document_id)

        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(update_query, params)
                return cur.rowcount > 0

    def get_stats(self) -> Dict:
        """Get database statistics with enhanced metrics"""
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(f"""
                    SELECT 
                        COUNT(*) as total_docs,
                        pg_size_pretty(pg_total_relation_size('{self.table_name}')) as total_size,
                        (SELECT COUNT(*) FROM {self.table_name} WHERE metadata IS NOT NULL) as docs_with_metadata
                    FROM {self.table_name}
                """)
                result = cur.fetchone()

                return {
                    "total_documents": result[0],
                    "total_size": result[1],
                    "docs_with_metadata": result[2],
                    "vector_dimension": self.vector_dim,
                }
