from fastapi import HTTPException, status
from app.core.database import db
from app.services.credit_service import CreditService
from app.services.maid_service import MaidService
from prisma.enums import BookingStatus, BookingType
from datetime import datetime
import uuid
from app.services.line_service import LineService
import logging

logger = logging.getLogger(__name__)

class BookingService:
    @staticmethod
    async def initiate_booking(user_id: str, data):
        # Step 1-4: Calculate Dynamic Credit Cost (Estimation)
        credit_cost = CreditService.calculate_credit_cost(
            service_type=data.type,
            party_size=data.party_size,
            maid_tier="TRAINEE"
        )
        return {
            "credit_cost": credit_cost,
            "service_type": data.type,
            "party_size": data.party_size
        }

    @staticmethod
    async def confirm_matching(user_id: str, data):
        # Step 5-10: Confirm and Start Matching
        ref_code = f"BK-{uuid.uuid4().hex[:8].upper()}"
        
        # Initial search for maid
        available_maids = await MaidService.find_available_maids(skill=str(data.type))
        if not available_maids:
            raise HTTPException(status_code=404, detail="No available maids found for this service")
        
        selected_maid = available_maids[0]
        
        # Calculate final cost for this specific maid's tier
        credit_cost = CreditService.calculate_credit_cost(
            service_type=data.type,
            party_size=data.party_size,
            maid_tier=selected_maid.tier
        )

        booking = await db.booking.create(
            data={
                "userId": user_id,
                "maidId": selected_maid.id,
                "type": data.type,
                "status": BookingStatus.AUTO_MATCHING,
                "scheduledAt": data.scheduled_at,
                "locationName": data.location_name,
                "customerLat": data.customer_lat,
                "customerLng": data.customer_lng,
                "partySize": data.party_size,
                "notes": data.notes,
                "creditCost": credit_cost,
                "referenceCode": ref_code,
                "rerollCount": 0
            },
            include={"maid": True}
        )
        
        return booking

    @staticmethod
    async def reroll_maid(booking_id: str):
        # Step 11-14: Request Reroll
        booking = await db.booking.find_unique(
            where={"id": booking_id},
            include={"maid": True}
        )
        
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        if booking.rerollCount >= 3:
            raise HTTPException(status_code=400, detail="Maximum reroll count reached")
            
        if booking.status != BookingStatus.AUTO_MATCHING:
            raise HTTPException(status_code=400, detail="Booking is not in matching state")

        # Exclude current maid
        exclude_ids = [booking.maidId]
        
        available_maids = await MaidService.find_available_maids(
            skill=str(booking.type),
            exclude_ids=exclude_ids
        )
        
        if not available_maids:
            raise HTTPException(status_code=404, detail="No more maids available for reroll")
            
        new_maid = available_maids[0]
        
        # Re-calculate cost for new maid tier
        new_credit_cost = CreditService.calculate_credit_cost(
            service_type=booking.type,
            party_size=booking.partySize,
            maid_tier=new_maid.tier
        )
        
        updated_booking = await db.booking.update(
            where={"id": booking_id},
            data={
                "maidId": new_maid.id,
                "rerollCount": {"increment": 1},
                "creditCost": new_credit_cost
            },
            include={"maid": True}
        )
        
        return updated_booking

    @staticmethod
    async def final_confirmation(booking_id: str):
        # Step 15-21: Final Confirmation
        booking = await db.booking.find_unique(
            where={"id": booking_id},
            include={"user": True, "maid": True}
        )
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
            
        if booking.status != BookingStatus.AUTO_MATCHING:
            raise HTTPException(status_code=400, detail="Booking is not in matching state")

        # Step 16-19: Verify and Deduct Credits
        await CreditService.deduct_credits(
            user_id=booking.userId,
            amount=booking.creditCost,
            reference_id=booking.id,
            description=f"Booking {booking.referenceCode}"
        )
        
        # Step 20: Update Booking Status CONFIRMED
        updated_booking = await db.booking.update(
            where={"id": booking_id},
            data={"status": BookingStatus.CONFIRMED},
            include={"maid": True}
        )
        
        # Notify User
        if booking.user.lineUid:
            LineService.push_message(
                booking.user.lineUid,
                f"ยืนยันการจองสำเร็จ! {updated_booking.maid.fullName} จะไปดูแลคุณตามเวลาที่นัดหมายครับ"
            )
            
        return updated_booking

    @staticmethod
    async def update_status(booking_id: str, status: BookingStatus):
        booking = await db.booking.find_unique(
            where={"id": booking_id},
            include={"user": True, "maid": True}
        )
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
            
        data = {"status": status}
        if status == BookingStatus.COMPLETED:
            data["completedAt"] = datetime.utcnow()
            
        updated_booking = await db.booking.update(
            where={"id": booking_id},
            data=data,
            include={"user": True, "maid": True}
        )
        
        # Push Notifications
        if updated_booking.user.lineUid:
            status_msgs = {
                BookingStatus.ARRIVED: f"แม่บ้าน {updated_booking.maid.fullName} เดินทางถึงสถานที่ของคุณแล้วครับ",
                BookingStatus.IN_PROGRESS: f"แม่บ้าน {updated_booking.maid.fullName} เริ่มงานทำความสะอาดแล้วครับ",
                BookingStatus.COMPLETED: f"งานของคุณเสร็จเรียบร้อยแล้วครับ! อย่าลืมประเมินผลงานเพื่อรับแต้มสะสมนะครับ"
            }
            if status in status_msgs:
                LineService.push_message(updated_booking.user.lineUid, status_msgs[status])
                
        return updated_booking

    @staticmethod
    async def update_location(booking_id: str, lat: float, lng: float):
        return await db.booking.update(
            where={"id": booking_id},
            data={
                "currentLat": lat,
                "currentLng": lng,
                "lastLocationAt": datetime.utcnow()
            }
        )

    @staticmethod
    async def get_location(booking_id: str):
        booking = await db.booking.find_unique(
            where={"id": booking_id},
            select={
                "currentLat": True,
                "currentLng": True,
                "customerLat": True,
                "customerLng": True,
                "lastLocationAt": True,
                "status": True
            }
        )
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        return booking
