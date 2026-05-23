from fastapi import HTTPException, status
from app.core.database import db
from app.core.security import create_access_token
import uuid
from datetime import datetime, timedelta

class AuthService:
    @staticmethod
    async def create_guest_session():
        guest_uuid = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(days=1)
        
        await db.guestsession.create(
            data={
                "guestUuid": guest_uuid,
                "expiredAt": expires_at
            }
        )
        
        user = await db.user.create(
            data={
                "isGuest": True,
                "displayName": f"Guest-{guest_uuid[:8]}"
            }
        )
        
        token = create_access_token(data={"sub": user.id, "isGuest": True})
        
        return {
            "guest_uuid": guest_uuid,
            "token": token,
            "expires_at": expires_at
        }
