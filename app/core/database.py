import asyncio
import logging
from prisma import Prisma
from app.core.config import settings

logger = logging.getLogger(__name__)

# Prisma client
db = Prisma(auto_register=True, datasource={"url": settings.DATABASE_URL})

# Track connection state so other parts of app can inspect without raising
db_connected = False


def is_db_connected() -> bool:
    """Return the current connection status."""
    return db_connected


async def connect_db(retries: int = 5, base_delay: float = 1.0) -> bool:
    """Attempt to connect to the database with exponential backoff.
    Returns True when connected, False otherwise. Does NOT raise to avoid
    crashing the FastAPI process during startup; callers should check the
    returned boolean and handle accordingly.
    """
    global db_connected
    attempt = 0
    print(f"[DB] Initializing connection to {settings.DATABASE_URL[:20]}...")
    while attempt < retries:
        attempt += 1
        try:
            await db.connect()
            db_connected = True
            print(f"[DB] Prisma connected to database (attempt={attempt})")
            logger.info("Prisma connected to database (attempt=%d)", attempt)
            return True
        except Exception as e:
            print(f"[DB] Connection attempt {attempt} failed: {str(e)}")
            logger.error("Database connect attempt %d failed: %s", attempt, e)
            db_connected = False
            if attempt < retries:
                sleep_for = base_delay * (2 ** (attempt - 1))
                print(f"[DB] Retrying in {sleep_for}s...")
                await asyncio.sleep(sleep_for)
            else:
                print(f"[DB] All {retries} connect attempts failed.")
                return False


async def disconnect_db():
    global db_connected
    try:
        if db.is_connected():
            await db.disconnect()
        db_connected = False
    except Exception as e:
        logger.warning("Error while disconnecting DB: %s", e)
