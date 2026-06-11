import asyncio
import logging
from prisma import Prisma
from app.core.config import settings

logger = logging.getLogger(__name__)

# Prisma client
db = Prisma(auto_register=True, datasource={"url": settings.DATABASE_URL})

# Track connection state so other parts of app can inspect without raising
db_connected = False


async def connect_db(retries: int = 5, base_delay: float = 1.0) -> bool:
    """Attempt to connect to the database with exponential backoff.
    Returns True when connected, False otherwise. Does NOT raise to avoid
    crashing the FastAPI process during startup; callers should check the
    returned boolean and handle accordingly.
    """
    global db_connected
    attempt = 0
    while attempt < retries:
        attempt += 1
        try:
            await db.connect()
            db_connected = True
            logger.info("Prisma connected to database (attempt=%d)", attempt)
            return True
        except Exception as e:
            logger.error("Database connect attempt %d failed: %s", attempt, e)
            db_connected = False
            if attempt < retries:
                sleep_for = base_delay * (2 ** (attempt - 1))
                logger.info("Retrying DB connect in %.1fs...", sleep_for)
                await asyncio.sleep(sleep_for)
            else:
                logger.error("All %d DB connect attempts failed.", retries)
                return False


async def disconnect_db():
    global db_connected
    try:
        if db.is_connected():
            await db.disconnect()
        db_connected = False
    except Exception as e:
        logger.warning("Error while disconnecting DB: %s", e)
