from fastapi import APIRouter
from app.api.v1.endpoints import (
    points,
    auth,
    maids,
    credit,
    gamification,
    bookings,
    line,
    reviews,
    debug,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(points.router, prefix="/points", tags=["Points"])
api_router.include_router(maids.router, prefix="/maids", tags=["Maids"])
api_router.include_router(credit.router, prefix="/credit", tags=["Credit"])
api_router.include_router(
    gamification.router, prefix="/gamification", tags=["Gamification"]
)
api_router.include_router(bookings.router, prefix="/bookings", tags=["Bookings"])
api_router.include_router(line.router, prefix="/line", tags=["Line"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["Reviews"])
api_router.include_router(debug.router, prefix="/debug", tags=["Debug"])
