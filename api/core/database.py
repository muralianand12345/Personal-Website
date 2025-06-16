from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class MongoDB:
    client: Optional[AsyncIOMotorClient] = None
    database: Optional[AsyncIOMotorDatabase] = None


db = MongoDB()


async def connect_to_mongo(connection_string: str, database_name: str):
    """Create database connection."""
    try:
        db.client = AsyncIOMotorClient(connection_string)
        db.database = db.client[database_name]

        # Test the connection
        await db.client.admin.command("ping")
        logger.info(f"Connected to MongoDB database: {database_name}")

    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise


async def close_mongo_connection():
    """Close database connection."""
    if db.client:
        db.client.close()
        logger.info("Disconnected from MongoDB")


def get_database() -> AsyncIOMotorDatabase:
    """Get database instance."""
    if not db.database:
        raise Exception("Database not initialized")
    return db.database
