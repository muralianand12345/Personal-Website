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
        self.collection_name = "music-guilds"  # Make sure this matches your actual collection name

    async def debug_database_info(self) -> Dict[str, Any]:
        """Debug method to check database connectivity and collection info."""
        try:
            # List all collections
            collections = await self.db.list_collection_names()
            logger.info(f"Available collections: {collections}")

            # Check if our target collection exists
            if self.collection_name not in collections:
                logger.warning(f"Collection '{self.collection_name}' not found!")
                return {
                    "status": "error",
                    "message": f"Collection '{self.collection_name}' not found",
                    "available_collections": collections,
                }

            # Count documents in the collection
            doc_count = await self.db[self.collection_name].count_documents({})
            logger.info(f"Documents in '{self.collection_name}': {doc_count}")

            # Get a sample document
            sample_doc = await self.db[self.collection_name].find_one({})

            return {
                "status": "success",
                "collection_name": self.collection_name,
                "document_count": doc_count,
                "sample_document_structure": {
                    "has_guildId": bool(sample_doc and "guildId" in sample_doc),
                    "has_songs": bool(sample_doc and "songs" in sample_doc),
                    "songs_count": len(sample_doc.get("songs", [])) if sample_doc else 0,
                    "sample_keys": list(sample_doc.keys()) if sample_doc else [],
                },
            }
        except Exception as e:
            logger.error(f"Database debug error: {e}")
            return {"status": "error", "message": str(e)}

    async def get_global_stats(
        self, guild_id: Optional[str] = None, limit: int = 10
    ) -> StatsResponse:
        """Get comprehensive global music statistics."""
        try:
            # Debug database info first
            debug_info = await self.debug_database_info()
            logger.info(f"Database debug info: {debug_info}")

            if debug_info["status"] == "error":
                logger.error(f"Database issue: {debug_info}")
                return self._empty_stats_response()

            # Build match criteria
            match_criteria = {}
            if guild_id:
                match_criteria["guildId"] = guild_id
                logger.info(f"Filtering by guild_id: {guild_id}")

            # Get all guild documents
            logger.info(f"Querying with criteria: {match_criteria}")
            cursor = self.db[self.collection_name].find(match_criteria)
            guild_docs = await cursor.to_list(length=None)

            logger.info(f"Found {len(guild_docs)} guild documents")

            if not guild_docs:
                logger.warning("No guild documents found")
                # If filtering by guild_id failed, try without filter to see if there's data
                if guild_id:
                    logger.info("Trying without guild_id filter...")
                    all_cursor = self.db[self.collection_name].find({})
                    all_docs = await all_cursor.to_list(length=None)
                    logger.info(f"Total documents without filter: {len(all_docs)}")
                    if all_docs:
                        # Show available guild IDs
                        guild_ids = [doc.get("guildId") for doc in all_docs if doc.get("guildId")]
                        logger.info(f"Available guild IDs: {guild_ids}")

                return self._empty_stats_response()

            # Aggregate all songs from all guilds
            all_songs = []
            for i, guild_doc in enumerate(guild_docs):
                songs = guild_doc.get("songs", [])
                logger.info(
                    f"Guild {i+1} (ID: {guild_doc.get('guildId', 'unknown')}): {len(songs)} songs"
                )
                all_songs.extend(songs)

            logger.info(f"Total songs collected: {len(all_songs)}")

            if not all_songs:
                logger.warning("No songs found in any guild documents")
                return self._empty_stats_response()

            # Log first song for debugging
            if all_songs:
                first_song = all_songs[0]
                logger.info(f"Sample song structure: {list(first_song.keys())}")
                logger.info(
                    f"Sample song data: track={first_song.get('track')}, "
                    f"author={first_song.get('author')}, "
                    f"played_number={first_song.get('played_number')}, "
                    f"duration={first_song.get('duration')}"
                )

            # Calculate statistics
            global_stats = await self._calculate_global_stats(all_songs)
            top_songs = await self._calculate_top_songs(all_songs, limit)

            logger.info(
                f"Calculated stats - Total plays: {global_stats.total_plays}, "
                f"Total songs: {global_stats.total_songs}"
            )

            return StatsResponse(global_stats=global_stats, top_songs=top_songs)

        except Exception as e:
            logger.error(f"Error getting global stats: {e}", exc_info=True)
            raise

    async def _calculate_global_stats(self, songs: List[Dict[str, Any]]) -> GlobalStats:
        """Calculate global statistics from songs list."""
        logger.info(f"Calculating global stats for {len(songs)} songs")

        total_songs = len(songs)
        total_plays = 0
        valid_plays = 0

        # Debug play counts
        for song in songs:
            plays = song.get("played_number", 0)
            if plays > 0:
                valid_plays += 1
                total_plays += plays
                logger.debug(f"Song '{song.get('track', 'unknown')}' has {plays} plays")

        logger.info(f"Songs with plays > 0: {valid_plays}/{total_songs}")
        logger.info(f"Total plays calculated: {total_plays}")

        # Calculate total duration with overflow protection
        total_duration_ms = 0
        valid_durations = 0

        for song in songs:
            duration = song.get("duration", 0)
            played_number = song.get("played_number", 0)

            # Validate individual values
            if duration > 0 and played_number > 0:
                valid_durations += 1
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

        logger.info(f"Songs with valid duration: {valid_durations}/{total_songs}")

        # Ensure the final value doesn't exceed maximum
        total_duration_ms = min(total_duration_ms, MAX_DURATION_MS)

        # Get unique artists
        unique_artists = set()
        for song in songs:
            artist = song.get("author", "").strip()
            if artist:
                unique_artists.add(artist.lower())

        logger.info(f"Unique artists found: {len(unique_artists)}")

        # Get unique requesters
        unique_requesters = set()
        requester_play_count = defaultdict(int)
        for song in songs:
            requester = song.get("requester", {})
            if requester and requester.get("id"):
                requester_id = requester["id"]
                unique_requesters.add(requester_id)
                requester_play_count[requester_id] += song.get("played_number", 0)

        logger.info(f"Unique requesters found: {len(unique_requesters)}")

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

        stats = GlobalStats(
            total_songs=total_songs,
            total_plays=total_plays,
            total_duration_ms=int(total_duration_ms),
            total_duration_formatted=format_duration(int(total_duration_ms)),
            unique_artists=len(unique_artists),
            unique_requesters=len(unique_requesters),
            most_active_requester=most_active_requester,
            average_song_duration_ms=int(average_duration),
        )

        logger.info(f"Final global stats: {stats}")
        return stats

    async def _calculate_top_songs(
        self, songs: List[Dict[str, Any]], limit: int
    ) -> List[TopSongStats]:
        """Calculate top songs by total plays."""
        logger.info(f"Calculating top {limit} songs")

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
                total_duration_ms=int(total_duration_ms),
                total_duration_formatted=format_duration(int(total_duration_ms)),
                unique_requesters=len(stats["requesters"]),
                artwork_url=stats["artwork_url"],
                spotify_uri=stats["spotify_uri"],
            )
            top_songs_list.append(top_song)

        # Sort by total plays (descending) and return top N
        top_songs_list.sort(key=lambda x: x.total_plays, reverse=True)
        logger.info(
            f"Top song: {top_songs_list[0].track if top_songs_list else 'None'} "
            f"with {top_songs_list[0].total_plays if top_songs_list else 0} plays"
        )

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
