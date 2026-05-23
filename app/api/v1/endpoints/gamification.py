from fastapi import APIRouter, Depends, Path
from app.services.gamification_service import GamificationService
from app.schemas.gamification import CreateCampaignDto
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/lucky-wheel/{campaign_id}/spin")
async def spin_lucky_wheel(campaign_id: str = Path(...), current_user = Depends(get_current_user)):
    """Spin the lucky wheel for a specific campaign"""
    return await GamificationService.spin_lucky_wheel(current_user.id, campaign_id)

@router.post("/campaign")
async def create_campaign(dto: CreateCampaignDto):
    """Create a new gamification campaign (Admin)"""
    return await GamificationService.create_campaign(dto)
