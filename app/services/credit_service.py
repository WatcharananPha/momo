from fastapi import HTTPException, status
from app.core.database import db
from prisma.enums import BookingType
from datetime import datetime, timedelta
from typing import List
import logging

logger = logging.getLogger(__name__)

SERVICE_CREDIT_MAPPING = {
    BookingType.GENERAL_CLEANING: 10,
    BookingType.DEEP_CLEANING: 30,
    BookingType.LAUNDRY: 15,
    BookingType.MOVING: 50,
    BookingType.REPAIR: 25,
    BookingType.COOKING: 15,
    BookingType.IRONING: 12,
}

class CreditService:
    @staticmethod
    async def get_wallet(user_id: str):
        wallet = await db.creditwallet.find_unique(where={"userId": user_id})
        
        if not wallet:
            wallet = await db.creditwallet.create(
                data={"userId": user_id, "balance": 0}
            )
            
        return {
            "id": wallet.id,
            "user_id": wallet.userId,
            "balance": wallet.balance,
            "updated_at": wallet.updatedAt
        }

    @staticmethod
    async def top_up(user_id: str, amount: int, reference_id: str = None):
        wallet_dict = await CreditService.get_wallet(user_id)
        wallet_id = wallet_dict["id"]
        
        async with db.tx() as transaction:
            await transaction.credittransaction.create(
                data={
                    "walletId": wallet_id,
                    "amount": amount,
                    "type": "TOP_UP",
                    "referenceId": reference_id,
                    "description": f"Top-up {amount} credits"
                }
            )
            
            wallet = await transaction.creditwallet.update(
                where={"id": wallet_id},
                data={"balance": {"increment": amount}}
            )
            
        return {
            "id": wallet.id,
            "user_id": wallet.userId,
            "balance": wallet.balance,
            "updated_at": wallet.updatedAt
        }

    @staticmethod
    async def deduct_credits(user_id: str, amount: int, reference_id: str, description: str):
        wallet_dict = await CreditService.get_wallet(user_id)
        wallet_id = wallet_dict["id"]
        
        if wallet_dict["balance"] < amount:
            raise HTTPException(status_code=400, detail="Insufficient credit balance")
            
        async with db.tx() as transaction:
            await transaction.credittransaction.create(
                data={
                    "walletId": wallet_id,
                    "amount": -amount,
                    "type": "BOOKING",
                    "referenceId": reference_id,
                    "description": description
                }
            )
            
            wallet = await transaction.creditwallet.update(
                where={"id": wallet_id},
                data={"balance": {"decrement": amount}}
            )
            
        return wallet

    @staticmethod
    async def get_history(user_id: str):
        wallet = await db.creditwallet.find_unique(where={"userId": user_id})
        if not wallet:
            return []
            
        transactions = await db.credittransaction.find_many(
            where={"walletId": wallet.id},
            order={"createdAt": "desc"}
        )
        return transactions

    @staticmethod
    async def get_packages():
        return await db.package.find_many(where={"isActive": True})

    @staticmethod
    def calculate_credit_cost(service_type: BookingType, party_size: int, maid_tier: str) -> int:
        base = SERVICE_CREDIT_MAPPING.get(service_type, 10)
        
        # Ensure maid_tier is string for comparison
        tier_str = str(maid_tier).split('.')[-1] if '.' in str(maid_tier) else str(maid_tier)
        
        multiplier = 1.0
        if tier_str == 'PRO': multiplier = 1.2
        elif tier_str == 'ELITE': multiplier = 1.5
        elif tier_str == 'MASTER': multiplier = 2.0
        
        return int(base * party_size * multiplier)

    @staticmethod
    async def purchase_subscription(user_id: str, package_id: str, omise_token: str = None):
        from app.services.payment_service import PaymentService
        
        pkg = await db.package.find_unique(where={"id": package_id})
        if not pkg:
            raise HTTPException(status_code=404, detail="Package not found")
            
        # Create charge via Omise
        # price is Decimal, convert to Satang (int)
        amount_satang = int(pkg.price * 100)
        
        charge = await PaymentService.create_charge(
            amount_in_satang=amount_satang,
            token=omise_token,
            description=f"Purchase Package: {pkg.name}"
        )
        
        start_date = datetime.utcnow()
        end_date = start_date + timedelta(days=pkg.durationDays)
        
        async with db.tx() as transaction:
            sub = await transaction.subscription.create(
                data={
                    "userId": user_id,
                    "packageId": package_id,
                    "startDate": start_date,
                    "endDate": end_date,
                    "status": "ACTIVE"
                }
            )
            
            # Record payment
            await transaction.payment.create(
                data={
                    "userId": user_id,
                    "bookingId": None, # This is a package purchase, not a booking
                    "amount": pkg.price,
                    "status": "PAID",
                    "provider": "OMISE",
                    "chargeId": str(charge.get("id")) if isinstance(charge, dict) else charge.id,
                    "metadata": "{}"
                }
            )
            
        # Top up credits
        await CreditService.top_up(user_id, pkg.credits, sub.id)
        
        return sub
