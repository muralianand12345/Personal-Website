from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from collections import defaultdict
import logging

from models.stats import TopSongStats, GlobalStats, StatsResponse
from utils.time_formatter import format_duration

logger = logging.getLogger(__name__)

# Maximum integer value to prevent overflow (about 9 quintillion milliseconds)
MAX_DURATION_MS = 9_223_372_036_854_775_807  # max int64


class StatsService:
    """Service for generating music statistics from MongoDB."""

    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.collection_name = "music-guilds"

    async def get_global_stats(
        self, guild_id: Optional[str] = None, limit: int = 10
    ) -> StatsResponse:
        """Get comprehensive global music statistics."""
        try:
            # Build match criteria
            match_criteria = {}
            if guild_id:
                match_criteria["guildId"] = guild_id

            # Get all guild documents
            cursor = self.db[self.collection_name].find(match_criteria)
            guild_docs = await cursor.to_list(length=None)

            if not guild_docs:
                return self._empty_stats_response()

            # Aggregate all songs from all guilds
            all_songs = []
            for guild_doc in guild_docs:
                songs = guild_doc.get("songs", [])
                all_songs.extend(songs)

            if not all_songs:
                return self._empty_stats_response()

            # Calculate statistics
            global_stats = await self._calculate_global_stats(all_songs)
            top_songs = await self._calculate_top_songs(all_songs, limit)

            return StatsResponse(global_stats=global_stats, top_songs=top_songs)

        except Exception as e:
            logger.error(f"Error getting global stats: {e}")
            raise

    async def _calculate_global_stats(self, songs: List[Dict[str, Any]]) -> GlobalStats:
        """Calculate global statistics from songs list."""
        total_songs = len(songs)
        total_plays = sum(song.get("played_number", 0) for song in songs)

        # Calculate total duration with overflow protection
        total_duration_ms = 0
        for song in songs:
            duration = song.get("duration", 0)
            played_number = song.get("played_number", 0)

            # Validate individual values
            if duration > 0 and played_number > 0:
                # Check for potential overflow before multiplication
                song_total_duration = duration * played_number

                # Cap individual song duration contribution to prevent overflow
                if song_total_duration > MAX_DURATION_MS // 1000:  # Leave some headroom
                    logger.warning(
                        f"Capping duration for song: {song.get('track', 'unknown')} - would overflow"
                    )
                    song_total_duration = MAX_DURATION_MS // 1000

                # Check if adding this would cause overflow
                if total_duration_ms > MAX_DURATION_MS - song_total_duration:
                    logger.warning("Total duration would overflow, capping at maximum value")
                    total_duration_ms = MAX_DURATION_MS
                    break

                total_duration_ms += song_total_duration

        # Ensure the final value doesn't exceed maximum
        total_duration_ms = min(total_duration_ms, MAX_DURATION_MS)

        # Get unique artists
        unique_artists = set()
        for song in songs:
            artist = song.get("author", "").strip()
            if artist:
                unique_artists.add(artist.lower())

        # Get unique requesters
        unique_requesters = set()
        requester_play_count = defaultdict(int)
        for song in songs:
            requester = song.get("requester", {})
            if requester and requester.get("id"):
                requester_id = requester["id"]
                unique_requesters.add(requester_id)
                requester_play_count[requester_id] += song.get("played_number", 0)

        # Find most active requester
        most_active_requester = {"username": "Unknown", "total_plays": 0}
        if requester_play_count:
            most_active_id = max(requester_play_count, key=requester_play_count.get)
            most_active_song = next(
                (song for song in songs if song.get("requester", {}).get("id") == most_active_id),
                None,
            )
            if most_active_song:
                requester_info = most_active_song["requester"]
                most_active_requester = {
                    "id": requester_info.get("id"),
                    "username": requester_info.get("username", "Unknown"),
                    "total_plays": requester_play_count[most_active_id],
                }

        # Calculate average song duration
        total_unique_duration = sum(song.get("duration", 0) for song in songs)
        average_duration = total_unique_duration // total_songs if total_songs > 0 else 0

        return GlobalStats(
            total_songs=total_songs,
            total_plays=total_plays,
            total_duration_ms=int(total_duration_ms),  # Ensure it's an integer
            total_duration_formatted=format_duration(int(total_duration_ms)),
            unique_artists=len(unique_artists),
            unique_requesters=len(unique_requesters),
            most_active_requester=most_active_requester,
            average_song_duration_ms=int(average_duration),
        )

    async def _calculate_top_songs(
        self, songs: List[Dict[str, Any]], limit: int
    ) -> List[TopSongStats]:
        """Calculate top songs by total plays."""
        # Group songs by track + artist combination
        song_stats = defaultdict(
            lambda: {
                "total_plays": 0,
                "duration": 0,
                "requesters": set(),
                "artwork_url": None,
                "spotify_uri": None,
                "track": "",
                "artist": "",
            }
        )

        for song in songs:
            track = song.get("track", "Unknown Track").strip()
            artist = song.get("author", "Unknown Artist").strip()
            song_key = f"{track.lower()}||{artist.lower()}"

            stats = song_stats[song_key]
            stats["track"] = track
            stats["artist"] = artist
            stats["total_plays"] += song.get("played_number", 0)
            stats["duration"] = song.get("duration", 0)
            stats["artwork_url"] = stats["artwork_url"] or song.get("artworkUrl")
            stats["spotify_uri"] = stats["spotify_uri"] or song.get("uri")

            # Add requester
            requester = song.get("requester", {})
            if requester and requester.get("id"):
                stats["requesters"].add(requester["id"])

        # Convert to list and sort by total plays
        top_songs_list = []
        for stats in song_stats.values():
            # Calculate total duration with overflow protection
            total_duration_ms = stats["duration"] * stats["total_plays"]

            # Cap individual song total duration to prevent overflow
            if total_duration_ms > MAX_DURATION_MS:
                logger.warning(
                    f"Capping total duration for song: {stats['track']} - would overflow"
                )
                total_duration_ms = MAX_DURATION_MS

            top_song = TopSongStats(
                track=stats["track"],
                artist=stats["artist"],
                total_plays=stats["total_plays"],
                total_duration_ms=int(total_duration_ms),  # Ensure it's an integer
                total_duration_formatted=format_duration(int(total_duration_ms)),
                unique_requesters=len(stats["requesters"]),
                artwork_url=stats["artwork_url"],
                spotify_uri=stats["spotify_uri"],
            )
            top_songs_list.append(top_song)

        # Sort by total plays (descending) and return top N
        top_songs_list.sort(key=lambda x: x.total_plays, reverse=True)
        return top_songs_list[:limit]

    def _empty_stats_response(self) -> StatsResponse:
        """Return empty stats response when no data is found."""
        return StatsResponse(
            global_stats=GlobalStats(
                total_songs=0,
                total_plays=0,
                total_duration_ms=0,
                total_duration_formatted="0 seconds",
                unique_artists=0,
                unique_requesters=0,
                most_active_requester={"username": "None", "total_plays": 0},
                average_song_duration_ms=0,
            ),
            top_songs=[],
        )
