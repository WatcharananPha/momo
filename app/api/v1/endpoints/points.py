from fastapi import APIRouter, Path
from app.services.point_service import PointService
from app.schemas.point import PointBalanceResponse

router = APIRouter()

@router.get("/balance/{user_id}", response_model=PointBalanceResponse)
async def get_point_balance(user_id: str = Path(...)):
    """Get the current point balance for a user"""
    return await PointService.get_balance(user_id)
