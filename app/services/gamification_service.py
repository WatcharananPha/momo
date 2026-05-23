from fastapi import HTTPException, status
from app.core.database import db
from app.services.point_service import PointService
from app.services.credit_service import CreditService
import logging
import random
from datetime import datetime

logger = logging.getLogger(__name__)

class GamificationService:
    @staticmethod
    async def spin_lucky_wheel(user_id: str, campaign_id: str):
        campaign = await db.campaign.find_unique(
            where={"id": campaign_id},
            include={"rewards": True}
        )

        if not campaign or not campaign.isActive:
            raise HTTPException(status_code=404, detail="Active campaign not found")

        now = datetime.utcnow()
        if now < campaign.startDate or now > campaign.endDate:
            raise HTTPException(status_code=400, detail="Campaign is not currently active")

        if not campaign.rewards:
            raise HTTPException(status_code=400, detail="No rewards available")

        # Logic for probability-based selection
        reward = GamificationService._select_reward(campaign.rewards)
        if not reward:
            raise HTTPException(status_code=400, detail="Could not determine reward")

        # Award reward
        if reward.type == "POINT":
            # Using private DB method or point service directly? We have point service.
            # However PointService earn points logic wasn't fully written in the python translation.
            # Let's write a simple direct DB injection here or expand PointService later.
            # Assuming PointService.earn_points exists (it doesn't yet, so let's mock the DB update for now or implement it)
            logger.info(f"Would award {reward.value} POINTS")
            # Minimal Point injection
            await db.pointtransaction.create(
                data={
                    "userId": user_id,
                    "type": "EARN",
                    "amount": reward.value,
                    "source": "MINIGAME",
                    "referenceId": reward.id,
                    "description": f"Won {reward.name} from Lucky Wheel"
                }
            )
            # Update balance
            balance = await db.userpointbalance.find_unique(where={"userId": user_id})
            if balance:
                await db.userpointbalance.update(
                    where={"userId": user_id},
                    data={
                        "totalPoints": {"increment": reward.value},
                        "availablePoints": {"increment": reward.value},
                        "lifetimePoints": {"increment": reward.value}
                    }
                )
            else:
                await db.userpointbalance.create(
                    data={
                        "userId": user_id,
                        "totalPoints": reward.value,
                        "availablePoints": reward.value,
                        "lifetimePoints": reward.value
                    }
                )
        elif reward.type == "CREDIT":
            await CreditService.top_up(user_id, reward.value, reward.id)

        logger.info(f"User {user_id} won {reward.name} from Lucky Wheel")
        return {"reward_id": reward.id, "name": reward.name, "value": reward.value, "type": reward.type}

    @staticmethod
    def _select_reward(rewards):
        total_prob = sum(r.probability for r in rewards)
        rand_val = random.uniform(0, total_prob)
        cumulative = 0.0

        for r in rewards:
            cumulative += r.probability
            if rand_val <= cumulative:
                return r
        return rewards[0] if rewards else None

    @staticmethod
    async def create_campaign(data: dict):
        rewards_data = [
            {
                "name": r.name,
                "type": r.type,
                "value": r.value,
                "probability": r.probability,
                "stock": r.stock
            }
            for r in data.rewards
        ]

        campaign = await db.campaign.create(
            data={
                "name": data.name,
                "description": data.description,
                "startDate": data.start_date,
                "endDate": data.end_date,
                "rewards": {
                    "create": rewards_data
                }
            },
            include={"rewards": True}
        )
        return campaign
