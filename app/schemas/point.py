from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class PointBalanceResponse(BaseModel):
    user_id: str
    total_points: int
    available_points: int
    lifetime_points: int
    updated_at: datetime

class PointTransactionResponse(BaseModel):
    id: str
    user_id: str
    type: str
    amount: int
    source: str
    description: Optional[str] = None
    created_at: datetime

class TransactionPageResponse(BaseModel):
    items: List[PointTransactionResponse]
    total: int
    page: int
    page_size: int
