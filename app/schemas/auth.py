from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class GuestSessionResponse(BaseModel):
    guest_uuid: str
    token: str
    expires_at: datetime

class LineLoginDto(BaseModel):
    id_token: str = Field(..., description="ID token received from LINE LIFF/Login")
    guest_uuid: Optional[str] = None
    referral_code: Optional[str] = None
    
class AuthResponse(BaseModel):
    access_token: str
    user_id: str
    is_guest: bool
    is_new_user: Optional[bool] = False
