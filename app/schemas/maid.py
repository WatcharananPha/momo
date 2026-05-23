from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class MaidSkillDto(BaseModel):
    skill: str
    level: int = 1

class OnboardMaidDto(BaseModel):
    full_name: str
    phone_number: str
    profile_picture_url: Optional[str] = None
    base_rate: float
    skills: List[MaidSkillDto]
    test_score: int
    demographics: Optional[dict] = None

class MaidProfileResponse(BaseModel):
    id: str
    full_name: str
    phone_number: str
    tier: str
    rating: float
    job_completed: int
    skills: List[dict]
