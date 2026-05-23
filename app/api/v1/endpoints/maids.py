from fastapi import APIRouter, Depends, Path
from app.services.maid_service import MaidService
from app.schemas.maid import OnboardMaidDto, MaidProfileResponse
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/onboard")
async def onboard(dto: OnboardMaidDto):
    """Register and onboard a new maid"""
    return await MaidService.onboard_maid(dto)

@router.get("/{maid_id}", response_model=MaidProfileResponse)
async def get_profile(maid_id: str = Path(...)):
    """Get maid profile and skill matrix"""
    return await MaidService.get_maid_profile(maid_id)

@router.patch("/{maid_id}/sync-tier")
async def sync_tier(maid_id: str = Path(...), current_user = Depends(get_current_user)):
    """Manually trigger tier synchronization for a maid"""
    await MaidService.sync_maid_tier(maid_id)
    return {"status": "success"}
