from fastapi import APIRouter, Depends, Body
from app.services.review_service import ReviewService
from app.api.deps import get_current_user
from prisma.models import User
from pydantic import BaseModel

router = APIRouter()

class ReviewCreateRequest(BaseModel):
    booking_id: str
    rating: float
    comment: str = None

@router.post("/")
async def create_review(req: ReviewCreateRequest, current_user: User = Depends(get_current_user)):
    """Submit a post-job review and earn points"""
    return await ReviewService.create_review(
        user_id=current_user.id,
        booking_id=req.booking_id,
        rating=req.rating,
        comment=req.comment
    )
