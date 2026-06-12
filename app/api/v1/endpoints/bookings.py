from fastapi import APIRouter, Depends, HTTPException, Body
import logging
from app.services.booking_service import BookingService
from app.schemas.booking import (
    BookingCreate,
    BookingResponse,
    BookingEstimateResponse,
    BookingLocationResponse,
)
from app.api import deps
from prisma.models import User
from prisma.enums import BookingStatus
from typing import List

router = APIRouter()


@router.post("/estimate", response_model=BookingEstimateResponse)
async def estimate_booking(
    data: BookingCreate, current_user: User = Depends(deps.get_current_user)
):
    """Step 1-4: Calculate Dynamic Credit Cost"""
    return await BookingService.initiate_booking(current_user.id, data)


@router.post("/confirm", response_model=BookingResponse)
async def confirm_and_match(
    data: BookingCreate, current_user: User = Depends(deps.get_current_user)
):
    """Step 5-10: Confirm and Start Matching"""
    return await BookingService.confirm_matching(current_user.id, data)


@router.post("/{booking_id}/reroll", response_model=BookingResponse)
async def reroll_maid(
    booking_id: str, current_user: User = Depends(deps.get_current_user)
):
    """Step 11-14: Request Reroll"""
    return await BookingService.reroll_maid(booking_id)


@router.post("/{booking_id}/final-confirm", response_model=BookingResponse)
async def final_confirm(
    booking_id: str, current_user: User = Depends(deps.get_current_user)
):
    """Step 15-21: Final Confirmation and Credit Deduction"""
    return await BookingService.final_confirmation(booking_id)


@router.patch("/{booking_id}/status", response_model=BookingResponse)
async def update_booking_status(
    booking_id: str,
    status: BookingStatus = Body(..., embed=True),
    current_user: User = Depends(deps.get_current_user),
):
    """Maid App: Update service status (ARRIVED, IN_PROGRESS, COMPLETED, etc.)"""
    # In a real app, we would verify if current_user is the maid assigned or an admin
    return await BookingService.update_status(booking_id, status)


@router.patch("/{booking_id}/location")
async def update_location(
    booking_id: str,
    lat: float = Body(..., embed=True),
    lng: float = Body(..., embed=True),
    current_user: User = Depends(deps.get_current_user),
):
    """Maid App: Update current GPS location of the maid during journey"""
    return await BookingService.update_location(booking_id, lat, lng)


@router.get("/{booking_id}/location", response_model=BookingLocationResponse)
async def get_location(
    booking_id: str, current_user: User = Depends(deps.get_current_user)
):
    """Customer App: Get current GPS location and ETA of the assigned maid"""
    logger = logging.getLogger(__name__)
    try:
        return await BookingService.get_location(booking_id)
    except HTTPException:
        # Let FastAPI handle known HTTPExceptions (404, 400, etc.)
        raise
    except Exception as e:
        logger.exception("Error fetching booking location for %s", booking_id)
        # Surface a controlled error to the client while logging the traceback
        raise HTTPException(
            status_code=500,
            detail="Internal server error while fetching booking location",
        )


@router.get("/me", response_model=List[BookingResponse])
async def get_my_bookings(current_user: User = Depends(deps.get_current_user)):
    from app.core.database import db

    bookings = await db.booking.find_many(
        where={"userId": current_user.id},
        include={"maid": True},
        order={"createdAt": "desc"},
    )
    return bookings
