from pydantic import BaseModel, Field, ConfigDict, AliasGenerator
from pydantic.alias_generators import to_camel
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
    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=AliasGenerator(
            validation_alias=to_camel,
            serialization_alias=to_camel,
        ),
        populate_by_name=True
    )
    id: str
    full_name: str
    phone_number: str
    tier: str
    rating: float
    job_completed: int
    skills: Optional[List[dict]] = None
    profile_picture_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance: Optional[float] = None
