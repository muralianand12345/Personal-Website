import os
from typing import List, Optional
from functools import lru_cache
from pydantic import Field, validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with comprehensive environment variable support."""

    # App Configuration
    app_name: str = "Personal Website API"
    version: str = "1.0.0"
    description: str = "FastAPI backend for LLM interactions"
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8000, env="PORT")
    debug: bool = Field(default=False, env="DEBUG")

    # CORS Configuration
    frontend_urls: List[str] = Field(
        default=[
            "http://localhost:3000",
            "https://muralianand.in",
            "https://www.muralianand.in",
        ],
        env="FRONTEND_URLS",
    )

    # LLM Configuration
    groq_api_key: str = Field(..., env="GROQ_API_KEY")
    model_name: str = Field(default="llama-3.2-90b-vision-preview", env="MODEL_NAME")
    temperature: float = Field(default=0.5, ge=0.0, le=2.0, env="TEMPERATURE")
    max_tokens: Optional[int] = Field(default=None, gt=0, env="MAX_TOKENS")
    top_p: float = Field(default=1.0, ge=0.0, le=1.0, env="TOP_P")

    # Database Configuration
    database_url: Optional[str] = Field(default=None, env="DATABASE_URL")
    db_host: str = Field(default="localhost", env="DB_HOST")
    db_port: int = Field(default=5432, env="DB_PORT")
    db_name: str = Field(default="vectordb", env="DB_NAME")
    db_user: str = Field(default="postgres", env="DB_USER")
    db_password: str = Field(default="", env="DB_PASSWORD")

    # Vector DB Configuration
    embedding_model: str = Field(
        default="sentence-transformers/all-MiniLM-L6-v2", env="EMBEDDING_MODEL"
    )
    vector_dimension: int = Field(default=384, env="VECTOR_DIMENSION")

    # System Prompt (moved to separate file for maintainability)
    system_prompt_file: str = Field(
        default="prompts/system_prompt.md", env="SYSTEM_PROMPT_FILE"
    )

    @validator("frontend_urls", pre=True)
    def parse_frontend_urls(cls, v):
        if isinstance(v, str):
            return [url.strip() for url in v.split(",")]
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
