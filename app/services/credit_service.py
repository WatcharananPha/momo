from fastapi import HTTPException, status
from app.core.database import db
from prisma.enums import BookingType
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

SERVICE_CREDIT_MAPPING = {
    BookingType.CLEANING: 10,
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
    def calculate_credit_cost(service_type: BookingType, party_size: int, maid_tier: str) -> int:
        base = SERVICE_CREDIT_MAPPING.get(service_type, 10)
        
        multiplier = 1.0
        if maid_tier == 'PRO': multiplier = 1.2
        elif maid_tier == 'ELITE': multiplier = 1.5
        elif maid_tier == 'MASTER': multiplier = 2.0
        
        return int(base * party_size * multiplier)

    @staticmethod
    async def purchase_subscription(user_id: str, package_id: str):
        pkg = await db.package.find_unique(where={"id": package_id})
        if not pkg:
            raise HTTPException(status_code=404, detail="Package not found")
            
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
            
        # Top up outside transaction to reuse the top_up logic
        await CreditService.top_up(user_id, pkg.credits, sub.id)
        
        return sub
