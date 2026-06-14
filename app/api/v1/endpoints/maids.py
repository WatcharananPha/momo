from fastapi import APIRouter, Depends, Path, Query, HTTPException
from typing import List
from app.services.maid_service import MaidService
from app.schemas.maid import OnboardMaidDto, MaidProfileResponse
from app.api.deps import get_current_user
from prisma.models import User

router = APIRouter()

@router.post("/onboard")
async def onboard(dto: OnboardMaidDto, current_user: User = Depends(get_current_user)):
    """Register and onboard a new maid linked to current user"""
    # Force the maid to be linked to the logged-in user
    dto_dict = dto.dict()
    # Pass user_id explicitly to service
    return await MaidService.onboard_maid(user_id=current_user.id, data=dto_dict)

@router.get("/me")
async def get_my_profile(current_user: User = Depends(get_current_user)):
    """Get the current logged-in maid's profile"""
    from app.core.database import db
    maid = await db.maid.find_unique(where={"userId": current_user.id}, include={"skills": True})
    if not maid:
        raise HTTPException(status_code=404, detail="Maid profile not found")
    
    return {
        "id": maid.id,
        "full_name": maid.fullName,
        "phone_number": maid.phoneNumber,
        "tier": maid.tier,
        "rating": maid.rating,
        "job_completed": maid.jobCompleted,
        "skills": [{"skill": s.skill, "level": s.level} for s in maid.skills] if maid.skills else []
    }

@router.get("/jobs/pending")
async def get_pending_jobs(current_user: User = Depends(get_current_user)):
    """Get broadcasted jobs available for the current maid"""
    return await MaidService.get_pending_jobs(current_user.id)

@router.post("/jobs/{booking_id}/accept")
async def accept_job(booking_id: str = Path(...), current_user: User = Depends(get_current_user)):
    """Accept a broadcasted job and return customer connection details"""
    return await MaidService.accept_job(current_user.id, booking_id)

@router.get("/nearby", response_model=List[MaidProfileResponse])
async def get_nearby_maids(
    lat: float = Query(...),
    lng: float = Query(...),
    skill: str = Query(...),
    current_user: User = Depends(get_current_user)
):
    """Get active maids nearby sorted by proximity"""
    return await MaidService.find_available_maids(
        skill=skill,
        lat=lat,
        lng=lng,
        limit=5
    )

@router.get("/{maid_id}", response_model=MaidProfileResponse)
async def get_profile(maid_id: str = Path(...)):
    """Get maid profile and skill matrix"""
    return await MaidService.get_maid_profile(maid_id)

@router.patch("/{maid_id}/sync-tier")
async def sync_tier(maid_id: str = Path(...), current_user: User = Depends(get_current_user)):
    """Manually trigger tier synchronization for a maid"""
    await MaidService.sync_maid_tier(maid_id)
    return {"status": "success"}
