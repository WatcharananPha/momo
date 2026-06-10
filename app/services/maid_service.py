from typing import List, Optional
from fastapi import HTTPException, status
from app.core.database import db
from prisma.enums import MaidTier, MaidStatus
import logging
import json

logger = logging.getLogger(__name__)

class MaidService:
    @staticmethod
    async def onboard_maid(data: dict):
        skills_data = [{"skill": s["skill"], "level": s["level"]} for s in data.get("skills", [])]
        
        passed = data.get("test_score", 0) >= 80
        maid_status = MaidStatus.ACTIVE if passed else MaidStatus.PENDING
        onboarding_status = "APPROVED" if passed else "REVIEWING"

        maid = await db.maid.create(
            data={
                "userId": data.get("user_id"),
                "fullName": data.get("full_name"),
                "phoneNumber": data.get("phone_number"),
                "profilePictureUrl": data.get("profile_picture_url"),
                "baseRate": data.get("base_rate", 450),
                "demographics": json.dumps(data.get("demographics", {})),
                "status": maid_status,
                "skills": {
                    "create": skills_data
                },
                "onboarding": {
                    "create": {
                        "testScore": data.get("test_score", 0),
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
    async def get_pending_jobs(user_id: str):
        maid = await db.maid.find_unique(where={"userId": user_id}, include={"skills": True})
        if not maid or maid.status != MaidStatus.ACTIVE:
            raise HTTPException(status_code=403, detail="Maid not active or found")
            
        maid_skills = [s.skill for s in maid.skills] if maid.skills else []
        
        from prisma.enums import BookingStatus
        pending_jobs = await db.booking.find_many(
            where={
                "status": BookingStatus.AUTO_MATCHING,
            },
            include={"user": {"include": {"membership": True}}},
            order={"createdAt": "desc"}
        )
        
        # Filter and enhance jobs
        eligible_jobs = []
        for job in pending_jobs:
            if str(job.type) in maid_skills:
                # Fetch customer tags
                tags = await db.customertag.find_many(where={"userId": job.userId})
                eligible_jobs.append({
                    "id": job.id,
                    "type": job.type,
                    "location_name": job.locationName,
                    "party_size": job.partySize,
                    "notes": job.notes,
                    "credit_cost": job.creditCost,
                    "customer_name": job.user.displayName,
                    "customer_tags": [t.tag for t in tags],
                    "membership_tier": job.user.membership.tier if job.user.membership else "SILVER"
                })
        return eligible_jobs

    @staticmethod
    async def accept_job(user_id: str, booking_id: str):
        maid = await db.maid.find_unique(where={"userId": user_id})
        if not maid or maid.status != MaidStatus.ACTIVE:
            raise HTTPException(status_code=403, detail="Maid not active or found")

        from prisma.enums import BookingStatus
        
        async with db.tx() as transaction:
            # Check if job is still available
            job = await transaction.booking.find_unique(where={"id": booking_id})
            if not job or job.status != BookingStatus.AUTO_MATCHING:
                raise HTTPException(status_code=400, detail="Job no longer available")
                
            # Accept job
            updated_job = await transaction.booking.update(
                where={"id": booking_id},
                data={
                    "status": BookingStatus.CONFIRMED,
                    "maidId": maid.id
                }
            )
            return updated_job

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
        
        # Calculate new base rate based on tier
        tier_rates = {
            MaidTier.TRAINEE: 450.00,
            MaidTier.PRO: 550.00,
            MaidTier.ELITE: 650.00,
            MaidTier.MASTER: 800.00
        }
        new_rate = tier_rates.get(new_tier, 450.00)

        if maid.tier == new_tier and float(maid.baseRate) == new_rate:
            return

        await db.maid.update(
            where={"id": maid_id},
            data={
                "tier": new_tier,
                "baseRate": new_rate
            }
        )

        logger.info(f"Maid {maid_id} updated: Tier {maid.tier}->{new_tier}, Rate {maid.baseRate}->{new_rate}")

    @staticmethod
    async def find_available_maids(skill: str, exclude_ids: List[str] = None, limit: int = 5):
        if exclude_ids is None:
            exclude_ids = []
            
        # Find maids who have the skill and are active, not in excluded list
        maids = await db.maid.find_many(
            where={
                "status": MaidStatus.ACTIVE,
                "id": {"not_in": exclude_ids},
                "skills": {
                    "some": {
                        "skill": skill
                    }
                }
            },
            include={"skills": True},
            order=[
                {"rating": "desc"},
                {"jobCompleted": "desc"}
            ],
            take=limit
        )
        return maids

    @staticmethod
    def _resolve_tier(job_completed: int, rating: float) -> MaidTier:
        if job_completed >= 500 and rating >= 4.8:
            return MaidTier.MASTER
        if job_completed >= 100 and rating >= 4.5:
            return MaidTier.ELITE
        if job_completed >= 20 and rating >= 4.0:
            return MaidTier.PRO
        return MaidTier.TRAINEE
