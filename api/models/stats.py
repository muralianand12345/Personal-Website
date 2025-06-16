from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class TopSongStats(BaseModel):
    """Top song statistics model."""

    track: str
    artist: str
    total_plays: int
    total_duration_ms: int
    total_duration_formatted: str
    unique_requesters: int
    artwork_url: Optional[str] = None
    spotify_uri: Optional[str] = None


class GlobalStats(BaseModel):
    """Global statistics model."""

    total_songs: int
    total_plays: int
    total_duration_ms: int
    total_duration_formatted: str
    unique_artists: int
    unique_requesters: int
    most_active_requester: Dict[str, Any]
    average_song_duration_ms: int


class StatsResponse(BaseModel):
    """Complete stats response model."""

    global_stats: GlobalStats
    top_songs: List[TopSongStats]
    generated_at: datetime = Field(default_factory=datetime.utcnow)