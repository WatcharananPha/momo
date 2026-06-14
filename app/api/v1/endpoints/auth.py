from fastapi import APIRouter, HTTPException
from app.services.auth_service import AuthService
from app.schemas.auth import GuestSessionResponse, LineLoginDto, AuthResponse
from app.core.config import settings
import requests

from app.core.database import db

router = APIRouter()

@router.get("/mock-maid")
async def get_mock_maid_token():
    """Debug/Local endpoint to get a mock token for the first maid in the database"""
    first_maid = await db.maid.find_first()
    if not first_maid:
        raise HTTPException(
            status_code=404, 
            detail="No maids found in database. Please run seed.py first."
        )
    
    from app.core.security import create_access_token
    token = create_access_token(data={"sub": first_maid.userId, "isGuest": False})
    
    return {
        "access_token": token,
        "maid_id": first_maid.id,
        "full_name": first_maid.fullName
    }


@router.get("/guest", response_model=GuestSessionResponse)
async def get_guest_session():
    """Create an anonymous guest session"""
    return await AuthService.create_guest_session()

@router.post("/login/line", response_model=AuthResponse)
async def login_line(data: LineLoginDto):
    """
    Login with LINE ID Token.
    Validates token and creates/updates user.
    """
    # 1. Verify ID Token with LINE API
    # In production, you'd use a library or call https://api.line.me/oauth2/v2.1/verify
    # For this phase, we will call the LINE verification endpoint
    verify_url = "https://api.line.me/oauth2/v2.1/verify"
    response = requests.post(verify_url, data={
        "id_token": data.id_token,
        "client_id": settings.LINE_LOGIN_CHANNEL_ID
    })
    
    if response.status_code != 200:
        print(f"LINE Token Verification Failed. Status: {response.status_code}, Body: {response.text}")
        raise HTTPException(status_code=401, detail=f"Invalid LINE ID Token: {response.text}")
    else:
        line_data = response.json()
    
    line_uid = line_data.get("sub")
    display_name = line_data.get("name")
    profile_url = line_data.get("picture")
    
    result = await AuthService.login_with_line(
        line_uid=line_uid,
        display_name=display_name,
        profile_url=profile_url,
        referral_code=data.referral_code,
        guest_uuid=data.guest_uuid
    )
    
    return {
        "access_token": result["token"],
        "user_id": result["user_id"],
        "is_guest": False,
        "is_new_user": result["is_new_user"]
    }

# Seed-database-temp route removed for production
