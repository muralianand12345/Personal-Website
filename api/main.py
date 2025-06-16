from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import logging
import uvicorn

from core.exceptions import APIException
from core.config import get_settings
from api.v1 import chat, health, stats

# Initialize settings
settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description=settings.description,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.debug else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

# Add CORS middleware with more permissive settings for debugging
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_urls_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)


# Add root endpoint for health check
@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Personal Website API", "status": "running"}


# Add a simple CORS test endpoint
@app.options("/{path:path}")
async def options_handler(request: Request):
    """Handle OPTIONS requests for CORS preflight."""
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Max-Age": "3600",
        },
    )


if not settings.debug:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["api.muralianand.in", "muralianand.in", "www.muralianand.in", "localhost"],
    )


# Exception handlers
@app.exception_handler(APIException)
async def api_exception_handler(request: Request, exc: APIException):
    """Handle API exceptions."""
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


# Include routers
app.include_router(health.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(stats.router, prefix="/api/v1")

if __name__ == "__main__":

    print("Starting API server...")
    print(f"Running on {settings.host}:{settings.port} with debug={settings.debug}")
    print(f"Frontend URLs: {settings.frontend_urls_list}")
    print(f"API Key: {settings.api_key}")
    print(f"Model Name: {settings.model_name}")

    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        log_level="debug" if settings.debug else "info",
        reload=settings.debug,
    )
