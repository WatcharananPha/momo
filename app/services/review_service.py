from fastapi import HTTPException
from app.core.database import db
from app.services.point_service import PointService
from app.services.maid_service import MaidService
from prisma.enums import BookingStatus
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class ReviewService:
    @staticmethod
    async def create_review(user_id: str, booking_id: str, rating: float, comment: str = None):
        # 1. Verify booking exists and belongs to user
        booking = await db.booking.find_unique(
            where={"id": booking_id},
            include={"maid": True}
        )
        
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        if booking.userId != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to review this booking")

        # 2. Check if already reviewed
        existing_review = await db.review.find_unique(where={"bookingId": booking_id})
        if existing_review:
            raise HTTPException(status_code=400, detail="Booking already reviewed")

        # 3. Check 48-hour window
        if booking.status != BookingStatus.COMPLETED:
            raise HTTPException(status_code=400, detail="Can only review completed bookings")
        
        if booking.completedAt:
            time_since_completion = datetime.utcnow() - booking.completedAt
            if time_since_completion > timedelta(hours=48):
                raise HTTPException(status_code=400, detail="Review period (48h) has expired")

        # 4. Create Review
        async with db.tx() as transaction:
            review = await transaction.review.create(
                data={
                    "bookingId": booking_id,
                    "userId": user_id,
                    "maidId": booking.maidId,
                    "rating": rating,
                    "comment": comment
                }
            )

            # 5. Award Points for reviewing
            # Assuming a standard point amount for review
            await PointService.award_points(
                user_id=user_id,
                amount=10, # e.g., 10 points for a review
                type="EARN",
                source="REVIEW",
                reference_id=review.id,
                description=f"Points earned for reviewing booking {booking.referenceCode}"
            )

            # 6. Update Maid Rating
            # Fetch all reviews for this maid
            all_reviews = await transaction.review.find_many(where={"maidId": booking.maidId})
            avg_rating = sum([r.rating for r in all_reviews]) / len(all_reviews)

            await transaction.maid.update(
                where={"id": booking.maidId},
                data={
                    "rating": avg_rating,
                    "jobCompleted": {"increment": 1}
                }
            )

        # 7. Trigger Dynamic Tiering check for the maid
        await MaidService.sync_maid_tier(booking.maidId)

        return review
