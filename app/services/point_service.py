import logging
from typing import Any, cast

from fastapi import HTTPException, status
from app.core.database import db
from prisma.enums import PointTransactionType, MembershipTier

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
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        already_awarded = await db.pointtransaction.find_first(
            where={"userId": user_id, "type": PointTransactionType.ONBOARDING}
        )
        if already_awarded:
            return 0

        rule = await db.pointrule.find_unique(where={"ruleName": "ONBOARDING"})
        point_amount = rule.pointAmount if rule and rule.isActive else 100

        async with db.tx() as transaction:
            await transaction.pointtransaction.create(
                data=cast(Any, {
                    "userId": user_id,
                    "type": PointTransactionType.ONBOARDING,
                    "amount": point_amount,
                    "source": "ONBOARDING",
                    "description": "Onboarding points — welcome gift",
                })
            )

            balance = await transaction.userpointbalance.find_unique(
                where={"userId": user_id}
            )
            
            if balance:
                await transaction.userpointbalance.update(
                    where={"userId": user_id},
                    data={
                        "totalPoints": {"increment": point_amount},
                        "availablePoints": {"increment": point_amount},
                        "lifetimePoints": {"increment": point_amount},
                    },
                )
            else:
                await transaction.userpointbalance.create(
                    data=cast(Any, {
                        "userId": user_id,
                        "totalPoints": point_amount,
                        "availablePoints": point_amount,
                        "lifetimePoints": point_amount,
                    })
                )

        logger.info(f"Onboarding points awarded: {point_amount} to {user_id}")
        return point_amount

    @staticmethod
    async def award_points(
        user_id: str, 
        amount: int, 
        type: PointTransactionType, 
        source: str, 
        reference_id: str | None = None, 
        description: str | None = None
    ) -> int:
        async with db.tx() as transaction:
            transaction_data: dict[str, Any] = {
                "userId": user_id,
                "type": type,
                "amount": amount,
                "source": source,
            }
            if reference_id is not None:
                transaction_data["referenceId"] = reference_id
            if description is not None:
                transaction_data["description"] = description

            await transaction.pointtransaction.create(
                data=cast(Any, transaction_data)
            )

            balance = await transaction.userpointbalance.find_unique(
                where={"userId": user_id}
            )
            
            if balance:
                updated_balance = await transaction.userpointbalance.update(
                    where={"userId": user_id},
                    data={
                        "totalPoints": {"increment": amount},
                        "availablePoints": {"increment": amount},
                        "lifetimePoints": {"increment": amount},
                    },
                )
            else:
                updated_balance = await transaction.userpointbalance.create(
                    data=cast(Any, {
                        "userId": user_id,
                        "totalPoints": amount,
                        "availablePoints": amount,
                        "lifetimePoints": amount,
                    })
                )

            if updated_balance and hasattr(updated_balance, "lifetimePoints"):
                new_tier = resolve_tier_by_lifetime(int(updated_balance.lifetimePoints))
                
                membership = await transaction.membership.find_unique(where={"userId": user_id})
                if membership:
                    await transaction.membership.update(
                        where={"userId": user_id},
                        data={"tier": new_tier}
                    )
                else:
                    await transaction.membership.create(
                        data=cast(Any, {
                            "userId": user_id,
                            "tier": new_tier
                        })
                    )

        logger.info(f"Points awarded: {amount} to {user_id} (Type: {type})")
        return amount

    @staticmethod
    async def get_balance(user_id: str) -> dict[str, Any]:
        user = await db.user.find_unique(
            where={"id": user_id},
            include={"pointBalance": True, "membership": True}
        )
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )
            
        balance = user.pointBalance
        if not balance:
            return {
                "user_id": user_id,
                "total_points": 0,
                "available_points": 0,
                "lifetime_points": 0,
                "referral_code": user.referralCode,
                "tier": user.membership.tier if user.membership else "SILVER"
            }

        return {
            "user_id": balance.userId,
            "total_points": balance.totalPoints,
            "available_points": balance.availablePoints,
            "lifetime_points": balance.lifetimePoints,
            "updated_at": balance.updatedAt,
            "referral_code": user.referralCode,
            "tier": user.membership.tier if user.membership else "SILVER"
        }
