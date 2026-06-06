import omise
from app.core.config import settings
from fastapi import HTTPException
import logging
import os

logger = logging.getLogger(__name__)

# Initialize Omise
omise.api_public_key = settings.OMISE_PUBLIC_KEY
omise.api_secret_key = settings.OMISE_SECRET_KEY

class PaymentService:
    @staticmethod
    async def create_charge(amount_in_satang: int, token: str, description: str):
        """
        Create a charge via Omise.
        Amount is in sub-units (Satang for THB).
        """
        if settings.PAYMENT_MOCK_MODE:
            logger.info(f"MOCK PAYMENT: Charging {amount_in_satang} Satang with token {token}")
            return {"id": f"chg_mock_{amount_in_satang}", "status": "successful"}

        try:
            charge = omise.Charge.create(
                amount=amount_in_satang,
                currency="THB",
                card=token,
                description=description
            )
            
            # Since omise-python is synchronous, we don't 'await' it 
            # but in a production async app, you'd run it in a threadpool
            
            if charge.status == "failed":
                raise HTTPException(status_code=400, detail=f"Payment failed: {charge.failure_message}")
            
            return charge
        except Exception as e:
            logger.error(f"Omise Error: {e}")
            raise HTTPException(status_code=400, detail=str(e))
