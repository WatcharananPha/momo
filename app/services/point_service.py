from fastapi import HTTPException, status
from app.core.database import db
from prisma.enums import PointTransactionType, MembershipTier
import logging

logger = logging.getLogger(__name__)

def resolve_tier_by_lifetime(lifetime_points: int) -> MembershipTier:
    if lifetime_points >= 50000:
        return MembershipTier.DIAMOND
    if lifetime_points >= 20000:
        return MembershipTier.PLATINUM
    if lifetime_points >= 5000:
        return MembershipTier.GOLD
    return MembershipTier.SILVER

class PointService:
    @staticmethod
    async def award_onboarding_points(user_id: str) -> int:
        user = await db.user.find_unique(where={"id": user_id})
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        already_awarded = await db.pointtransaction.find_first(
            where={"userId": user_id, "type": PointTransactionType.ONBOARDING}
        )
        if already_awarded:
            return 0

        rule = await db.pointrule.find_unique(where={"ruleName": "ONBOARDING"})
        point_amount = rule.pointAmount if rule and rule.isActive else 100

        async with db.tx() as transaction:
            await transaction.pointtransaction.create(
                data={
                    "userId": user_id,
                    "type": PointTransactionType.ONBOARDING,
                    "amount": point_amount,
                    "source": "ONBOARDING",
                    "description": "Onboarding points — welcome gift"
                }
            )

            # Prisma Python doesn't have upsert yet, emulate it
            balance = await transaction.userpointbalance.find_unique(where={"userId": user_id})
            if balance:
                await transaction.userpointbalance.update(
                    where={"userId": user_id},
                    data={
                        "totalPoints": {"increment": point_amount},
                        "availablePoints": {"increment": point_amount},
                        "lifetimePoints": {"increment": point_amount}
                    }
                )
            else:
                await transaction.userpointbalance.create(
                    data={
                        "userId": user_id,
                        "totalPoints": point_amount,
                        "availablePoints": point_amount,
                        "lifetimePoints": point_amount
                    }
                )

        logger.info(f"Onboarding points awarded: {point_amount} to {user_id}")
        return point_amount

    @staticmethod
    async def get_balance(user_id: str):
        balance = await db.userpointbalance.find_unique(where={"userId": user_id})
        if not balance:
            user = await db.user.find_unique(where={"id": user_id})
            if not user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
            return {
                "user_id": user_id,
                "total_points": 0,
                "available_points": 0,
                "lifetime_points": 0,
            }
            
        return {
            "user_id": balance.userId,
            "total_points": balance.totalPoints,
            "available_points": balance.availablePoints,
            "lifetime_points": balance.lifetimePoints,
            "updated_at": balance.updatedAt
        }
