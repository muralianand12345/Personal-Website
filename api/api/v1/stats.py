from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Annotated, Optional

from services.stats_service import StatsService
from core.database import get_database
from models.stats import StatsResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter(prefix="/stats", tags=["stats"])


def get_stats_service(
    database: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
) -> StatsService:
    """Get Stats service instance."""
    return StatsService(database)


@router.get("/", response_model=StatsResponse)
async def get_music_stats(
    stats_service: Annotated[StatsService, Depends(get_stats_service)],
    limit: int = Query(default=10, ge=1, le=50, description="Number of top songs to return"),
    guild_id: Optional[str] = Query(default=None, description="Filter by specific guild ID"),
):
    """
    Get comprehensive music statistics including:
    - Global stats (total songs, plays, duration, etc.)
    - Top N songs by play count
    - Artist and requester statistics

    No authentication required.
    """
    try:
        stats = await stats_service.get_global_stats(guild_id=guild_id, limit=limit)
        return stats

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving stats: {str(e)}",
        )


@router.get("/guilds/{guild_id}", response_model=StatsResponse)
async def get_guild_stats(
    guild_id: str,
    stats_service: Annotated[StatsService, Depends(get_stats_service)],
    limit: int = Query(default=10, ge=1, le=50, description="Number of top songs to return"),
):
    """
    Get music statistics for a specific guild.
    No authentication required.
    """
    try:
        stats = await stats_service.get_global_stats(guild_id=guild_id, limit=limit)
        return stats

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving guild stats: {str(e)}",
        )
