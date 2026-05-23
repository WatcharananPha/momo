from pydantic import BaseModel
from typing import List
from datetime import datetime

class RewardDto(BaseModel):
    name: str
    type: str
    value: int
    probability: float
    stock: int = -1

class CreateCampaignDto(BaseModel):
    name: str
    description: str
    start_date: datetime
    end_date: datetime
    rewards: List[RewardDto]
