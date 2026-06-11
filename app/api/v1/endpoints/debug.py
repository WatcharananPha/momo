from fastapi import APIRouter
from app.core.database import is_db_connected

router = APIRouter()


@router.get("/diagnostics")
async def diagnostics():
    """Return basic diagnostics for the running app so cloud-side 502/502
    situations can be triaged remotely.
    """
    return {"status": "ok", "db_connected": is_db_connected()}
