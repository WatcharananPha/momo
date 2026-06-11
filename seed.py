import asyncio
import logging
import os
import uuid
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

from app.core.database import db
from prisma.enums import MaidTier, MaidStatus, BookingType, MembershipTier

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def seed_packages():
    logger.info("Seeding Packages...")
    packages = [
        {
            "name": "Starter Package",
            "price": 990.00,
            "credits": 50,
            "description": "Perfect for small condos"
        },
        {
            "name": "Value Package",
            "price": 1990.00,
            "credits": 120,
            "description": "Best value for families"
        },
        {
            "name": "Pro Package",
            "price": 4500.00,
            "credits": 300,
            "description": "For large houses"
        }
    ]

    for pkg in packages:
        existing = await db.creditpackage.find_first(where={"name": pkg["name"]})
        if not existing:
            await db.creditpackage.create(data=pkg)
            logger.info(f"Created package: {pkg['name']}")
        else:
            logger.info(f"Package {pkg['name']} already exists, skipping.")

async def seed_maids():
    logger.info("Seeding Maids...")
    maids = [
        {
            "fullName": "คุณสมศรี ใจดี",
            "phoneNumber": "0812345678",
            "tier": MaidTier.MASTER,
            "baseRate": 800.00,
            "rating": 4.9,
            "jobCompleted": 520,
            "status": MaidStatus.ACTIVE,
            "skills": [BookingType.GENERAL_CLEANING, BookingType.COOKING, BookingType.IRONING]
        },
        {
            "fullName": "คุณประนอม ขยันงาน",
            "phoneNumber": "0823456789",
            "tier": MaidTier.ELITE,
            "baseRate": 650.00,
            "rating": 4.7,
            "jobCompleted": 150,
            "status": MaidStatus.ACTIVE,
            "skills": [BookingType.GENERAL_CLEANING, BookingType.IRONING]
        },
        {
            "fullName": "คุณจันจิรา รักสะอาด",
            "phoneNumber": "0834567890",
            "tier": MaidTier.PRO,
            "baseRate": 550.00,
            "rating": 4.5,
            "jobCompleted": 45,
            "status": MaidStatus.ACTIVE,
            "skills": [BookingType.GENERAL_CLEANING]
        },
        {
            "fullName": "คุณบัวชมพู แสนดี",
            "phoneNumber": "0845678901",
            "tier": MaidTier.TRAINEE,
            "baseRate": 450.00,
            "rating": 4.0,
            "jobCompleted": 5,
            "status": MaidStatus.ACTIVE,
            "skills": [BookingType.GENERAL_CLEANING]
        }
    ]

    for m in maids:
        # We need a user for each maid in this new schema
        user_existing = await db.user.find_first(where={"displayName": m["fullName"]})
        if not user_existing:
            user = await db.user.create(data={
                "displayName": m["fullName"],
                "isGuest": False
            })
        else:
            user = user_existing

        existing = await db.maid.find_first(where={"userId": user.id})
        if not existing:
            skills = m.pop("skills")
            m["userId"] = user.id
            maid = await db.maid.create(data=m)
            for s in skills:
                await db.maidskill.create(data={
                    "maidId": maid.id,
                    "skill": s,
                    "level": 3 if m["tier"] == MaidTier.MASTER else 1
                })
            logger.info(f"Created maid: {m['fullName']} for user {user.id}")
        else:
            logger.info(f"Maid {m['fullName']} already exists, skipping.")

async def seed_campaigns():
    logger.info("Seeding Campaigns...")
    start_date = datetime.utcnow()
    end_date = start_date + timedelta(days=30)
    
    title = "Welcome Lucky Wheel 2026"
    existing = await db.campaign.find_first(where={"title": title})
    
    if not existing:
        campaign = await db.campaign.create(
            data={
                "title": title,
                "description": "สุ่มรับรางวัลสำหรับสมาชิกใหม่",
                "startDate": start_date,
                "endDate": end_date,
                "isActive": True,
                "rewards": {
                    "create": [
                        {"rewardType": "POINT", "value": 50, "probability": 0.5},
                        {"rewardType": "POINT", "value": 100, "probability": 0.3},
                        {"rewardType": "CREDIT", "value": 10, "probability": 0.15},
                        {"rewardType": "CREDIT", "value": 50, "probability": 0.05}
                    ]
                }
            }
        )
        logger.info(f"Created campaign: {title}")
    else:
        logger.info(f"Campaign {title} already exists, skipping.")

async def seed_point_rules():
    logger.info("Seeding Point Rules...")
    rules = [
        {
            "ruleName": "NEW_MEMBER_ONBOARDING",
            "pointAmount": 100,
            "isActive": True
        }
    ]
    for rule in rules:
        existing = await db.pointrule.find_first(where={"ruleName": rule["ruleName"]})
        if not existing:
            await db.pointrule.create(data=rule)
            logger.info(f"Created point rule: {rule['ruleName']}")
        else:
            logger.info(f"Point rule {rule['ruleName']} already exists, skipping.")

async def main():
    await db.connect()
    try:
        await seed_packages()
        await seed_maids()
        await seed_campaigns()
        await seed_point_rules()
        logger.info("Seeding complete! 🌱")
    except Exception as e:
        logger.error(f"Seeding failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
