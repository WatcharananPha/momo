import asyncio
import logging
import os
import uuid
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

from app.core.database import db
from prisma.enums import MaidTier, MaidStatus, BookingType, MembershipTier, BookingStatus

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
            "latitude": 13.7597,
            "longitude": 100.5031,
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
            "latitude": 13.7462,
            "longitude": 100.5302,
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
            "latitude": 13.7222,
            "longitude": 100.5284,
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
            "latitude": 13.8012,
            "longitude": 100.5401,
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
            skills = m.pop("skills") if "skills" in m else []
            await db.maid.update(
                where={"id": existing.id},
                data={
                    "latitude": m.get("latitude"),
                    "longitude": m.get("longitude"),
                    "tier": m.get("tier"),
                    "rating": m.get("rating"),
                    "status": m.get("status"),
                }
            )
            logger.info(f"Maid {m['fullName']} coordinates updated.")

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

async def seed_bookings():
    logger.info("Seeding Mock Bookings...")
    mock_customers = [
        {
            "name": "คุณณิชาภา (Nichapa)",
            "tier": MembershipTier.GOLD,
            "tags": ["No Pets (In bedroom)", "Friendly", "Provide Tools"],
            "booking": {
                "type": BookingType.GENERAL_CLEANING,
                "scheduledAt": datetime.utcnow() + timedelta(hours=2),
                "locationName": "Ideo Mobi สุขุมวิท 81 (BTS อ่อนนุช)",
                "partySize": 2,
                "notes": "เช็ดฝุ่น กวาด ถูห้องขนาด 32 ตร.ม. และล้างระเบียงภายนอก ห้องนอนมีฝุ่นเยอะหน่อย มีแมว 1 ตัว (เชื่องมาก)",
                "creditCost": 550,
                "referenceCode": "REF-MOCK-1",
                "customerLat": 13.7055,
                "customerLng": 100.6015
            }
        },
        {
            "name": "คุณวิทวัส (Witawat)",
            "tier": MembershipTier.PLATINUM,
            "tags": ["Cats in house", "Provide Tools", "Vaccinated Only"],
            "booking": {
                "type": BookingType.DEEP_CLEANING,
                "scheduledAt": datetime.utcnow() + timedelta(days=1),
                "locationName": "บ้านเดี่ยว แสนสิริ พัฒนาการ",
                "partySize": 5,
                "notes": "ต้องการล้างตู้เย็นภายนอก-ใน เช็ดกระจกขอบสูงทุกจุด และล้างลานจอดรถ มีเครื่องดูดฝุ่นและน้ำยาให้ครบถ้วน",
                "creditCost": 1550,
                "referenceCode": "REF-MOCK-2",
                "customerLat": 13.7381,
                "customerLng": 100.6322
            }
        },
        {
            "name": "คุณจรรยา (Janya)",
            "tier": MembershipTier.SILVER,
            "tags": ["No Pets", "Bring Spray"],
            "booking": {
                "type": BookingType.IRONING,
                "scheduledAt": datetime.utcnow() + timedelta(days=1, hours=4),
                "locationName": "Lumpini Suite ดินแดง-ราชปรารภ",
                "partySize": 3,
                "notes": "รีดเสื้อเชิ้ตทำงาน 15 ตัว กางเกงสแล็ค 5 ตัว พับเก็บในตู้ให้เรียบร้อย ขอสเปรย์ฉีดผ้าหอมกลิ่นธรรมชาติติดตัวมาด้วยนะคะ",
                "creditCost": 750,
                "referenceCode": "REF-MOCK-3",
                "customerLat": 13.7545,
                "customerLng": 100.5422
            }
        },
        {
            "name": "คุณปกรณ์ (Pakorn)",
            "tier": MembershipTier.DIAMOND,
            "tags": ["Ingredients Ready", "High Rating"],
            "booking": {
                "type": BookingType.COOKING,
                "scheduledAt": datetime.utcnow() + timedelta(days=2),
                "locationName": "Noble Red อารีย์ (ซอย 1)",
                "partySize": 3,
                "notes": "ช่วยทำกับข้าว 3 เมนู: แกงส้มชะอมไข่ กะเพราไก่สับ และต้มจืดเต้าหู้ไข่ วัตถุดิบซื้อเตรียมไว้ให้ในตู้เย็นแล้วค่ะ",
                "creditCost": 900,
                "referenceCode": "REF-MOCK-4",
                "customerLat": 13.7795,
                "customerLng": 100.5445
            }
        }
    ]

    for cust in mock_customers:
        # Create user
        user = await db.user.find_first(where={"displayName": cust["name"]})
        if not user:
            user = await db.user.create(data={
                "displayName": cust["name"],
                "isGuest": False
            })
            logger.info(f"Created customer user: {cust['name']}")
        
        # Create membership
        membership = await db.membership.find_first(where={"userId": user.id})
        if not membership:
            await db.membership.create(data={
                "userId": user.id,
                "tier": cust["tier"]
            })
            logger.info(f"Created membership {cust['tier']} for user {cust['name']}")
        
        # Create tags
        for t in cust["tags"]:
            tag_existing = await db.customertag.find_first(where={
                "userId": user.id,
                "tag": t
            })
            if not tag_existing:
                await db.customertag.create(data={
                    "userId": user.id,
                    "tag": t
                })
                logger.info(f"Added tag {t} to user {cust['name']}")

        # Create booking
        b_data = cust["booking"]
        b_existing = await db.booking.find_first(where={"referenceCode": b_data["referenceCode"]})
        if not b_existing:
            await db.booking.create(data={
                "userId": user.id,
                "type": b_data["type"],
                "status": BookingStatus.AUTO_MATCHING,
                "scheduledAt": b_data["scheduledAt"],
                "locationName": b_data["locationName"],
                "partySize": b_data["partySize"],
                "notes": b_data["notes"],
                "creditCost": b_data["creditCost"],
                "referenceCode": b_data["referenceCode"],
                "customerLat": b_data["customerLat"],
                "customerLng": b_data["customerLng"]
            })
            logger.info(f"Created mock booking {b_data['referenceCode']} ({b_data['type']})")
        else:
            # Update scheduledAt just to make sure it's relative to current time on seed retry
            await db.booking.update(
                where={"id": b_existing.id},
                data={
                    "status": BookingStatus.AUTO_MATCHING,
                    "scheduledAt": b_data["scheduledAt"]
                }
            )
            logger.info(f"Mock booking {b_data['referenceCode']} already exists, updated schedule.")

async def main():
    await db.connect()
    try:
        await seed_packages()
        await seed_maids()
        await seed_campaigns()
        await seed_point_rules()
        await seed_bookings()
        logger.info("Seeding complete! 🌱")
    except Exception as e:
        logger.error(f"Seeding failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
