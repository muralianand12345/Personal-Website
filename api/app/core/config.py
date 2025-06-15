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
    port: int = Field(default=8001, env="PORT")
    debug: bool = Field(default=False, env="DEBUG")

    # API Key Authentication
    api_key: str = Field(..., env="API_KEY")

    # CORS Configuration
    frontend_urls: str = Field(
        default="http://localhost:3000,https://muralianand.in,https://www.muralianand.in",
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
        return [url.strip() for url in self.frontend_urls.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
