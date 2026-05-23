from fastapi import HTTPException, status
from app.core.database import db
from prisma.enums import MaidTier, MaidStatus
import logging
import json

logger = logging.getLogger(__name__)

class MaidService:
    @staticmethod
    async def onboard_maid(data: dict):
        skills_data = [{"skill": s.skill, "level": s.level} for s in data.skills]
        
        passed = data.test_score >= 80
        maid_status = MaidStatus.ACTIVE if passed else MaidStatus.PENDING
        onboarding_status = "APPROVED" if passed else "REVIEWING"

        maid = await db.maid.create(
            data={
                "fullName": data.full_name,
                "phoneNumber": data.phone_number,
                "profilePictureUrl": data.profile_picture_url,
                "baseRate": data.base_rate,
                "demographics": json.dumps(data.demographics) if data.demographics else "{}",
                "status": maid_status,
                "skills": {
                    "create": skills_data
                },
                "onboarding": {
                    "create": {
                        "testScore": data.test_score,
                        "passed": passed,
                        "status": onboarding_status
                    }
                }
            },
            include={"skills": True, "onboarding": True}
        )

        logger.info(f"Maid onboarded: {maid.id} - {maid.fullName}")
        return maid

    @staticmethod
    async def get_maid_profile(maid_id: str):
        maid = await db.maid.find_unique(
            where={"id": maid_id},
            include={"skills": True}
        )
        if not maid:
            raise HTTPException(status_code=404, detail="Maid not found")
        
        # Format response to match schema
        return {
            "id": maid.id,
            "full_name": maid.fullName,
            "phone_number": maid.phoneNumber,
            "tier": maid.tier,
            "rating": maid.rating,
            "job_completed": maid.jobCompleted,
            "skills": [{"skill": s.skill, "level": s.level, "rating": s.rating} for s in maid.skills] if maid.skills else []
        }

    @staticmethod
    async def sync_maid_tier(maid_id: str):
        maid = await db.maid.find_unique(where={"id": maid_id})
        if not maid:
            return

        new_tier = MaidService._resolve_tier(maid.jobCompleted, maid.rating)
        if maid.tier == new_tier:
            return

        await db.maid.update(
            where={"id": maid_id},
            data={"tier": new_tier}
        )

        logger.info(f"Maid {maid_id} tier updated: {maid.tier} -> {new_tier}")

    @staticmethod
    def _resolve_tier(job_completed: int, rating: float) -> MaidTier:
        if job_completed >= 500 and rating >= 4.8:
            return MaidTier.MASTER
        if job_completed >= 100 and rating >= 4.5:
            return MaidTier.ELITE
        if job_completed >= 20 and rating >= 4.0:
            return MaidTier.PRO
        return MaidTier.TRAINEE
