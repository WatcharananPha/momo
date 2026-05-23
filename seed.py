import asyncio
import logging
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

from app.core.database import db
from prisma.enums import MaidTier, MaidStatus, BookingType

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
            "durationDays": 30
        },
        {
            "name": "Value Package",
            "price": 1990.00,
            "credits": 120,
            "durationDays": 30
        },
        {
            "name": "Pro Package",
            "price": 4500.00,
            "credits": 300,
            "durationDays": 60
        }
    ]

    for pkg in packages:
        existing = await db.package.find_first(where={"name": pkg["name"]})
        if not existing:
            await db.package.create(data=pkg)
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
            "skills": [BookingType.CLEANING, BookingType.COOKING, BookingType.IRONING]
        },
        {
            "fullName": "คุณประนอม ขยันงาน",
            "phoneNumber": "0823456789",
            "tier": MaidTier.ELITE,
            "baseRate": 650.00,
            "rating": 4.7,
            "jobCompleted": 150,
            "status": MaidStatus.ACTIVE,
            "skills": [BookingType.CLEANING, BookingType.IRONING]
        },
        {
            "fullName": "คุณจันจิรา รักสะอาด",
            "phoneNumber": "0834567890",
            "tier": MaidTier.PRO,
            "baseRate": 550.00,
            "rating": 4.5,
            "jobCompleted": 45,
            "status": MaidStatus.ACTIVE,
            "skills": [BookingType.CLEANING]
        },
        {
            "fullName": "คุณบัวชมพู แสนดี",
            "phoneNumber": "0845678901",
            "tier": MaidTier.TRAINEE,
            "baseRate": 450.00,
            "rating": 4.0,
            "jobCompleted": 5,
            "status": MaidStatus.ACTIVE,
            "skills": [BookingType.CLEANING]
        }
    ]

    for m in maids:
        existing = await db.maid.find_first(where={"phoneNumber": m["phoneNumber"]})
        if not existing:
            skills = m.pop("skills")
            maid = await db.maid.create(data=m)
            for s in skills:
                await db.maidskill.create(data={
                    "maidId": maid.id,
                    "skill": s,
                    "level": 3 if m["tier"] == MaidTier.MASTER else 1,
                    "rating": m["rating"]
                })
            logger.info(f"Created maid: {m['fullName']} with skills")
        else:
            logger.info(f"Maid {m['fullName']} already exists, skipping.")

async def seed_campaigns():
    logger.info("Seeding Campaigns...")
    start_date = datetime.utcnow()
    end_date = start_date + timedelta(days=30)
    
    campaign_name = "Welcome Lucky Wheel 2026"
    existing = await db.campaign.find_first(where={"name": campaign_name})
    
    if not existing:
        campaign = await db.campaign.create(
            data={
                "name": campaign_name,
                "description": "สุ่มรับรางวัลสำหรับสมาชิกใหม่",
                "startDate": start_date,
                "endDate": end_date,
                "isActive": True,
                "rewards": {
                    "create": [
                        {"name": "50 Points", "type": "POINT", "value": 50, "probability": 0.5},
                        {"name": "100 Points", "type": "POINT", "value": 100, "probability": 0.3},
                        {"name": "10 Credits", "type": "CREDIT", "value": 10, "probability": 0.15},
                        {"name": "50 Credits", "type": "CREDIT", "value": 50, "probability": 0.05}
                    ]
                }
            }
        )
        logger.info(f"Created campaign: {campaign_name}")
    else:
        logger.info(f"Campaign {campaign_name} already exists, skipping.")

async def main():
    await db.connect()
    try:
        await seed_packages()
        await seed_maids()
        await seed_campaigns()
        logger.info("Seeding complete! 🌱")
    except Exception as e:
        logger.error(f"Seeding failed: {e}")
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
