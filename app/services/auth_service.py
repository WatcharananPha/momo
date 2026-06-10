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
        
        # Initialize wallet and points for guest too
        await db.creditwallet.create(data={"userId": user.id, "balance": 0})
        await db.userpointbalance.create(data={"userId": user.id})
        
        token = create_access_token(data={"sub": user.id, "isGuest": True})
        
        return {
            "guest_uuid": guest_uuid,
            "token": token,
            "expires_at": expires_at
        }

    @staticmethod
    async def login_with_line(line_uid: str, display_name: str, profile_url: str = None, referral_code: str = None, guest_uuid: str = None):
        user = await db.user.find_first(where={"lineUid": line_uid})
        is_new_user = False

        if not user:
            is_new_user = True
            
            # Check referral
            referred_by_id = None
            if referral_code:
                referrer = await db.user.find_unique(where={"referralCode": referral_code})
                if referrer:
                    referred_by_id = referrer.id

            # Create new user
            user_data = {
                "lineUid": line_uid,
                "displayName": display_name,
                "profilePictureUrl": profile_url,
                "isGuest": False,
                "referralCode": str(uuid.uuid4())[:8].upper(),
                "referredBy": referred_by_id
            }
            
            user = await db.user.create(data=user_data)
            
            # Initialize systems
            await db.membership.create(data={"userId": user.id})
            await db.creditwallet.create(data={"userId": user.id, "balance": 0})
            await db.userpointbalance.create(data={"userId": user.id})
            
            # Award Onboarding Points to new user
            from app.services.point_service import PointService
            await PointService.award_onboarding_points(user.id)

            # Award Referral Points to referrer
            if referred_by_id:
                await PointService.award_points(
                    user_id=referred_by_id,
                    amount=50, # 50 points for successful referral
                    type="REFERRAL",
                    source="SYSTEM",
                    reference_id=user.id,
                    description=f"Referral bonus for inviting {display_name}"
                )

        # Handle Guest to Member conversion if guest_uuid is provided
        if guest_uuid:
            guest_session = await db.guestsession.find_first(where={"guestUuid": guest_uuid})
            if guest_session and not guest_session.convertedToUserId:
                await db.guestsession.update(
                    where={"guestUuid": guest_uuid},
                    data={"convertedToUserId": user.id}
                )
                # Potential logic to transfer guest bookings to this user could go here

        token = create_access_token(data={"sub": user.id, "isGuest": False})
        
        return {
            "token": token,
            "user_id": user.id,
            "is_new_user": is_new_user
        }
