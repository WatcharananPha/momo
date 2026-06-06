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
    async def login_with_line(line_uid: str, display_name: str, profile_url: str = None, guest_uuid: str = None):
        user = await db.user.find_first(where={"lineUid": line_uid})
        is_new_user = False

        if not user:
            is_new_user = True
            # Create new user
            user_data = {
                "lineUid": line_uid,
                "displayName": display_name,
                "profilePictureUrl": profile_url,
                "isGuest": False,
                "referralCode": str(uuid.uuid4())[:8].upper()
            }
            
            user = await db.user.create(data=user_data)
            
            # Initialize systems
            await db.membership.create(data={"userId": user.id})
            await db.creditwallet.create(data={"userId": user.id, "balance": 0})
            await db.userpointbalance.create(data={"userId": user.id})
            
            # Award Onboarding Points
            rule = await db.pointrule.find_first(where={"ruleName": "NEW_MEMBER_ONBOARDING", "isActive": True})
            if rule:
                await db.pointtransaction.create(
                    data={
                        "userId": user.id,
                        "amount": rule.pointAmount,
                        "type": "ONBOARDING",
                        "source": "SYSTEM",
                        "description": "Welcome bonus for joining MaidBooking"
                    }
                )
                # Update balance
                await db.userpointbalance.update(
                    where={"userId": user.id},
                    data={
                        "availablePoints": {"increment": rule.pointAmount},
                        "totalPoints": {"increment": rule.pointAmount},
                        "lifetimePoints": {"increment": rule.pointAmount}
                    }
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
