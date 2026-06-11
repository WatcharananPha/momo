from pydantic import BaseModel, Field, ConfigDict, AliasGenerator
from pydantic.alias_generators import to_camel
from typing import Optional, List
from datetime import datetime
from prisma.enums import BookingType, BookingStatus

class BookingBase(BaseModel):
    type: BookingType
    scheduled_at: datetime
    location_name: str
    customer_lat: Optional[float] = None
    customer_lng: Optional[float] = None
    party_size: int = Field(1, description="Duration/Rooms/Units")
    notes: Optional[str] = None

class BookingCreate(BookingBase):
    pass

class BookingEstimateResponse(BaseModel):
    model_config = ConfigDict(
        alias_generator=AliasGenerator(
            validation_alias=to_camel,
            serialization_alias=to_camel,
        ),
        populate_by_name=True
    )
    credit_cost: int
    service_type: BookingType
    party_size: int

class BookingResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=AliasGenerator(
            validation_alias=to_camel,
            serialization_alias=to_camel,
        ),
        populate_by_name=True
    )
    
    id: str
    user_id: str
    maid_id: Optional[str] = None
    status: BookingStatus
    type: BookingType
    credit_cost: Optional[int] = None
    reroll_count: int
    reference_code: str
    maid: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

class BookingMaidMatchResponse(BaseModel):
    booking_id: str
    maid: Optional[dict] = None
    reroll_count: int
    can_reroll: bool
