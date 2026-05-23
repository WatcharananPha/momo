from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CreditWalletResponse(BaseModel):
    id: str
    user_id: str
    balance: int
    updated_at: datetime

class TopUpRequest(BaseModel):
    amount: int
    
class PurchasePackageRequest(BaseModel):
    package_id: str
