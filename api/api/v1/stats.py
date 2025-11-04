from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Annotated, Optional, Dict, Any

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


@router.get("/debug", response_model=Dict[str, Any])
async def debug_database(
    stats_service: Annotated[StatsService, Depends(get_stats_service)],
):
    """
    Debug endpoint to check database connectivity and collection structure.
    Helps diagnose why stats might be returning zero values.
    """
    try:
        debug_info = await stats_service.debug_database_info()
        return debug_info
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error debugging database: {str(e)}",
        )


@router.get("/", response_model=StatsResponse)
async def get_music_stats(
    stats_service: Annotated[StatsService, Depends(get_stats_service)],
    limit: int = Query(default=10, ge=1, le=50, description="Number of top songs to return"),
    guild_id: Optional[str] = Query(default=None, description="Filter by specific guild ID"),
    debug: bool = Query(default=False, description="Include debug logging"),
):
    """
    Get comprehensive music statistics including:
    - Global stats (total songs, plays, duration, etc.)
    - Top N songs by play count
    - Artist and requester statistics

    Use ?debug=true for additional logging output.
    No authentication required.
    """
    try:
        if debug:
            debug_info = await stats_service.debug_database_info()
            print(f"Debug info: {debug_info}")

        stats = await stats_service.get_global_stats(guild_id=guild_id, limit=limit)
        return stats

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving stats: {str(e)}",
        )


@router.get("/guilds", response_model=Dict[str, Any])
async def list_available_guilds(
    stats_service: Annotated[StatsService, Depends(get_stats_service)],
):
    """
    List all available guild IDs in the database.
    Helpful for debugging guild_id filtering.
    """
    try:
        database = stats_service.db
        collection_name = stats_service.collection_name
        cursor = database[collection_name].find({}, {"guildId": 1, "_id": 0})
        docs = await cursor.to_list(length=None)

        guild_ids = [doc.get("guildId") for doc in docs if doc.get("guildId")]

        return {
            "available_guild_ids": guild_ids,
            "total_guilds": len(guild_ids),
            "collection_name": collection_name,
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing guilds: {str(e)}",
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
