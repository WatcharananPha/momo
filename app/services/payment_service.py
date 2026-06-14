import omise
import logging
from typing import Any
from app.core.config import settings
from fastapi import HTTPException

logger = logging.getLogger(__name__)

class PaymentService:
    @staticmethod
    async def create_charge(amount_in_satang: int, token: str, description: str) -> dict[str, Any]:
        """
        Create a charge via Omise.
        Amount is in sub-units (Satang for THB).
        """
        if settings.PAYMENT_MOCK_MODE:
            logger.info(f"MOCK PAYMENT: Charging {amount_in_satang} Satang with token {token}")
            return {"id": f"chg_mock_{amount_in_satang}", "status": "successful"}

        # ตั้งค่า Omise Secret Key สำหรับการสร้าง charge จากฝั่ง Server
        omise.api_secret = settings.OMISE_SECRET_KEY

        charge: Any = omise.Charge.create(
            amount=amount_in_satang,
            currency="thb",
            card=token,
            description=description,
        )

        if charge.status != "successful":
            error_msg = charge.failure_message or "Payment failed"
            raise HTTPException(status_code=400, detail=error_msg)

        return {"id": charge.id, "status": charge.status}
