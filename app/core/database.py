from prisma import Prisma
from app.core.config import settings

db = Prisma(
    auto_register=True,
    datasource={'url': settings.DATABASE_URL}
)

async def connect_db():
    await db.connect()

async def disconnect_db():
    if db.is_connected():
        await db.disconnect()
