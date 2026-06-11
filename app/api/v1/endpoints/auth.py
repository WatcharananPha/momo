from fastapi import APIRouter, HTTPException
from app.services.auth_service import AuthService
from app.schemas.auth import GuestSessionResponse, LineLoginDto, AuthResponse
from app.core.config import settings
import requests

router = APIRouter()

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
        # For prototype/testing purposes, if token is "mock_token", we bypass
        if data.id_token == "mock_token":
            line_data = {
                "sub": "U_MOCK_USER_123",
                "name": "Mock User",
                "picture": "https://example.com/mock.jpg"
            }
        else:
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

@router.post("/seed-database-temp")
async def seed_database_temp():
    """Temporary endpoint to seed the database on Railway"""
    import os
    result = os.system("python3 seed.py")
    if result == 0:
        return {"status": "success", "message": "Database seeded"}
    else:
        raise HTTPException(status_code=500, detail="Seeding failed")
