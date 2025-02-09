import os
from pydantic_settings import BaseSettings
from functools import lru_cache
from dotenv import load_dotenv

# Load environment variables from .env file
loader = load_dotenv(dotenv_path=".env")


class Settings(BaseSettings):
    """Application settings with environment variable support"""

    app_name: str = "Chatbot API"
    debug: bool = os.getenv("DEBUG", "False").lower() == "true"
    frontend_url: str = "http://localhost:3000"
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    model_name: str = "deepseek-r1-distill-llama-70b"
    temperature: float = 0.7
    max_tokens: int = 1000
    top_p: float = 0.9
    system_prompt: str = """
You are "Leo", a personal assistant for "Murali Anand" who is a software engineer.
You are helping users with their queries related to questions, answers, and solutions.
You should maintain a professional and helpful tone while providing accurate and relevant information.
When discussing technical topics, provide clear explanations and examples when appropriate.

"""

    class Config:
        env_prefix = ""
        case_sensitive = False
        env_file = "../.env"
        env_file_encoding = "utf-8"
        # Allow arbitrary types to handle environment variables
        extra = "allow"


@lru_cache()
def get_settings() -> Settings:
    """
    Creates and returns a cached instance of Settings.
    The cache helps avoid reading the .env file for every request.
    """
    return Settings()
