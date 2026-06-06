from fastapi import APIRouter, Path, Depends
from app.services.point_service import PointService
from app.schemas.point import PointBalanceResponse
from app.api.deps import get_current_user
from prisma.models import User

router = APIRouter()

@router.get("/balance/me", response_model=PointBalanceResponse)
async def get_my_balance(current_user: User = Depends(get_current_user)):
    """Get the current point balance for the authenticated user"""
    return await PointService.get_balance(current_user.id)

@router.post("/join", response_model=int)
async def join_membership(current_user: User = Depends(get_current_user)):
    """Join membership and receive onboarding points"""
    return await PointService.award_onboarding_points(current_user.id)

@router.get("/balance/{user_id}", response_model=PointBalanceResponse)
async def get_point_balance(user_id: str = Path(...)):
    """Get the current point balance for a user (Admin)"""
    return await PointService.get_balance(user_id)
