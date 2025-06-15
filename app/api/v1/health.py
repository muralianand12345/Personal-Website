from fastapi import APIRouter, Depends
from typing import Annotated

from app.core.config import Settings, get_settings


router = APIRouter(prefix="/health", tags=["health"])


@router.get("/")
async def health_check(settings: Annotated[Settings, Depends(get_settings)]):
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app_name": settings.app_name,
        "version": settings.version,
    }
