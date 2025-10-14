from functools import lru_cache
from typing import List, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with comprehensive environment variable support."""

    app_name: str = "Personal Website API"
    version: str = "1.0.0"
    description: str = "FastAPI backend for LLM interactions"
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8001, env="PORT")
    debug: bool = Field(default=False, env="DEBUG")
    environment: str = Field(default="development", env="ENVIRONMENT")
    api_key: str = Field(..., env="API_KEY")
    frontend_urls: str = Field(
        default="http://localhost:3000,http://localhost:8000,http://localhost:8001,https://muralianand.in,https://www.muralianand.in",
        env="FRONTEND_URLS",
    )
    mongodb_connection_string: Optional[str] = Field(
        default=None, env="MONGODB_CONNECTION_STRING"
    )
    mongodb_database_name: str = Field(default="music_bot", env="MONGODB_DATABASE_NAME")

    @field_validator("frontend_urls", pre=True)
    def parse_frontend_urls(cls, v):
        if isinstance(v, str):
            return v
        return v

    @property
    def frontend_urls_list(self) -> List[str]:
        """Get frontend URLs as a list."""
        urls = [url.strip() for url in self.frontend_urls.split(",")]

        if self.environment == "production":
            production_urls = [
                "https://muralianand.in",
                "https://www.muralianand.in",
                "https://api.muralianand.in",
            ]
            for url in production_urls:
                if url not in urls:
                    urls.append(url)

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

        print(f"Configured CORS origins: {urls}")
        return urls

    @property
    def is_mongodb_enabled(self) -> bool:
        """Check if MongoDB is configured and enabled."""
        return bool(self.mongodb_connection_string)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
