from pydantic import BaseModel, ConfigDict, AliasGenerator, Field
from pydantic.alias_generators import to_camel
from typing import Optional, List
from datetime import datetime

class CreditWalletResponse(BaseModel):
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
    balance: int
    updated_at: datetime

class TopUpRequest(BaseModel):
    amount: int
    
class PurchasePackageRequest(BaseModel):
    package_id: str
    omise_token: Optional[str] = None # Optional for mock mode

class CreditTransactionResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=AliasGenerator(
            validation_alias=to_camel,
            serialization_alias=to_camel,
        ),
        populate_by_name=True
    )

    id: str
    wallet_id: str
    amount: int
    type: str
    reference_id: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime
