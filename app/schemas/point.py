from pydantic import BaseModel, Field, ConfigDict, AliasGenerator
from pydantic.alias_generators import to_camel
from typing import Optional, List
from datetime import datetime

class PointBalanceResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=AliasGenerator(
            validation_alias=to_camel,
            serialization_alias=to_camel,
        ),
        populate_by_name=True
    )

    user_id: str
    total_points: int
    available_points: int
    lifetime_points: int
    updated_at: datetime

class PointTransactionResponse(BaseModel):
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
