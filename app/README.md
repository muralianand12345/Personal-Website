# Quick Setup Guide

## 1. Install Dependencies

```bash
cd api
poetry install
```

## 2. Set Environment Variables

Create `.env` file:

```bash
# Generate a secure API key (you can use this command)
python -c "import secrets; print('API_KEY=' + secrets.token_urlsafe(32))"

# Add your Groq API key
echo "GROQ_API_KEY=your_groq_api_key_here" >> .env
```

Complete `.env` file:
```env
HOST=0.0.0.0
PORT=8000
DEBUG=true
API_KEY=your_generated_secure_key_here
GROQ_API_KEY=your_groq_api_key_here
MODEL_NAME=llama-3.2-90b-vision-preview
TEMPERATURE=0.5
MAX_TOKENS=4096
FRONTEND_URLS=http://localhost:3000,https://muralianand.in
```

## 3. Run the API

```bash
poetry run uvicorn app.main:app --reload
```

## 4. Test the API

### Health Check (No Auth Required)
```bash
curl http://localhost:8000/api/v1/health/
```

### Chat Endpoint (Auth Required)
```bash
curl -X POST "http://localhost:8000/api/v1/chat/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_api_key_here" \
  -d '{
    "message": "Hello, how can you help me with Python?",
    "temperature": 0.7
  }'
```

## 5. Frontend Integration

In your Next.js frontend, use the API like this:

```typescript
const API_BASE_URL = 'http://localhost:8000/api/v1';
const API_KEY = 'your_api_key_here';

const response = await fetch(`${API_BASE_URL}/chat/`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
  },
  body: JSON.stringify({
    message: userMessage,
    chat_history: previousMessages,
    temperature: 0.7,
  }),
});

const data = await response.json();
console.log(data.response); // LLM response
```

## API Endpoints

- `GET /api/v1/health/` - Health check (no auth)
- `POST /api/v1/chat/` - Chat with LLM (requires API key)
- `GET /docs` - Swagger UI (debug mode only)

## Security Notes

- Keep your API key secure
- Use HTTPS in production
- The API key should be different from your Groq API key
- Store API keys in environment variables, not in code