# Personal Website Backend

A modern, scalable FastAPI backend for LLM interactions with vector database support.

## Features

- **Clean Architecture**: Proper separation of concerns with services, models, and API layers
- **LLM Integration**: Seamless integration with Groq API for chat functionality
- **Vector Database**: PostgreSQL with pgvector for RAG capabilities
- **Async Support**: Full async/await support for better performance
- **Type Safety**: Comprehensive type hints with Pydantic validation
- **Error Handling**: Robust error handling with custom exceptions
- **Configuration**: Environment-based configuration with validation
- **Security**: CORS, trusted hosts, and input validation
- **Testing**: Test-ready structure with pytest integration

## Project Structure

```
api/
├── app/
│   ├── core/           # Core configuration and dependencies
│   ├── models/         # Data models
│   ├── schemas/        # API schemas (request/response)
│   ├── services/       # Business logic
│   ├── api/            # API routes
│   └── utils/          # Utility functions
├── tests/
├── prompts/            # System prompts
└── pyproject.toml
```

## Quick Start

1. **Install dependencies**:
   ```bash
   pip install -e .
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configurations
   ```

3. **Run the application**:
   ```bash
   uvicorn app.main:app --reload
   ```

## API Endpoints

- `POST /api/v1/chat/` - Chat with the LLM
- `GET /api/v1/health/` - Health check

## Configuration

All configuration is handled through environment variables. See `.env.example` for available options.

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Format code
black app/
isort app/

# Type checking
mypy app/

# Run tests
pytest
```