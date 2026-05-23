from fastapi import APIRouter
from app.services.auth_service import AuthService
from app.schemas.auth import GuestSessionResponse

router = APIRouter()

@router.get("/guest", response_model=GuestSessionResponse)
async def get_guest_session():
    """Create an anonymous guest session"""
    return await AuthService.create_guest_session()
