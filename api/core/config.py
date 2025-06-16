from typing import List, Optional
from functools import lru_cache
from pydantic import Field, validator
from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    """Application settings with comprehensive environment variable support."""

    # App Configuration
    app_name: str = "Personal Website API"
    version: str = "1.0.0"
    description: str = "FastAPI backend for LLM interactions"
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8001, env="PORT")
    debug: bool = Field(default=False, env="DEBUG")

    # MongoDB Configuration
    mongodb_url: str = Field(default="mongodb://localhost:27017", env="MONGODB_URL")
    mongodb_database: str = Field(default="discord_bot", env="MONGODB_DATABASE")

    # API Key Authentication
    api_key: str = Field(..., env="API_KEY")

    # CORS Configuration - More explicit for production
    frontend_urls: str = Field(
        default="http://localhost:3000,http://localhost:8000,http://localhost:8001,https://muralianand.in,https://www.muralianand.in",
        env="FRONTEND_URLS",
    )

    # LLM Configuration
    groq_api_key: str = Field(..., env="GROQ_API_KEY")
    model_name: str = Field(default="llama-3.2-90b-vision-preview", env="MODEL_NAME")
    temperature: float = Field(default=0.5, ge=0.0, le=2.0, env="TEMPERATURE")
    max_tokens: Optional[int] = Field(default=4096, gt=0, env="MAX_TOKENS")
    top_p: float = Field(default=1.0, ge=0.0, le=1.0, env="TOP_P")

    # System Prompt
    system_prompt_file: str = Field(default="prompts/system_prompt.md", env="SYSTEM_PROMPT_FILE")

    @validator("frontend_urls", pre=True)
    def parse_frontend_urls(cls, v):
        if isinstance(v, str):
            return v
        return v

    @property
    def frontend_urls_list(self) -> List[str]:
        """Get frontend URLs as a list."""
        urls = [url.strip() for url in self.frontend_urls.split(",")]

        # If in production and no specific URLs provided, allow common variations
        if os.getenv("ENVIRONMENT") == "production":
            production_urls = [
                "https://muralianand.in",
                "https://www.muralianand.in",
                "https://api.muralianand.in",  # Self-reference for testing
            ]
            # Add production URLs if not already present
            for url in production_urls:
                if url not in urls:
                    urls.append(url)

        # In development, be more permissive
        if self.debug:
            dev_urls = [
                "http://localhost:3000",
                "http://localhost:8000",
                "http://localhost:8001",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:8000",
                "http://127.0.0.1:8001",
            ]
            for url in dev_urls:
                if url not in urls:
                    urls.append(url)

        print(f"Configured CORS origins: {urls}")  # Debug output
        return urls

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
