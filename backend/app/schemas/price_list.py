from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field, model_validator


# ------------------------------------------------------------------------------
# PriceList Schemas
# ------------------------------------------------------------------------------

class PriceListBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Descriptive price schedule name")
    currency: str = Field(default="USD", max_length=10, description="ISO Currency code (USD, EUR, GBP, INR)")
    customer_tier: Optional[str] = Field(
        default=None,
        max_length=50,
        description="Target customer tier (e.g. silver, gold, enterprise) or None for standard base default",
    )
    product_id: Optional[uuid.UUID] = Field(
        default=None,
        description="Optional specific product linkage; if None, applies tier-wide or catalog default",
    )
    base_price: float = Field(..., ge=0.0, description="Governed base price amount")
    effective_from: datetime = Field(..., description="Timestamp from which this price schedule becomes active")
    effective_to: Optional[datetime] = Field(
        default=None,
        description="Optional timestamp until which this price schedule remains active",
    )


class PriceListCreate(PriceListBase):
    @model_validator(mode="after")
    def validate_effective_dates(self) -> "PriceListCreate":
        if self.effective_to is not None and self.effective_from >= self.effective_to:
            raise ValueError(
                f"effective_from ({self.effective_from}) must be strictly earlier than effective_to ({self.effective_to})"
            )
        return self


class PriceListUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    currency: Optional[str] = Field(default=None, max_length=10)
    customer_tier: Optional[str] = Field(default=None, max_length=50)
    product_id: Optional[uuid.UUID] = None
    base_price: Optional[float] = Field(default=None, ge=0.0)
    effective_from: Optional[datetime] = None
    effective_to: Optional[datetime] = None

    @model_validator(mode="after")
    def validate_effective_dates(self) -> "PriceListUpdate":
        if self.effective_from is not None and self.effective_to is not None:
            if self.effective_from >= self.effective_to:
                raise ValueError("effective_from must be strictly earlier than effective_to")
        return self


class PriceListResponse(PriceListBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class PriceListListResponse(BaseModel):
    items: List[PriceListResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ------------------------------------------------------------------------------
# Pricing Lookup / Calculation Schemas
# ------------------------------------------------------------------------------

class PriceLookupRequest(BaseModel):
    product_id: uuid.UUID = Field(..., description="Target product ID to quote")
    customer_tier: Optional[str] = Field(
        default=None,
        description="Account tier level (e.g. 'gold', 'silver', 'enterprise')",
    )
    as_of_date: Optional[datetime] = Field(
        default=None,
        description="Point-in-time calculation timestamp (defaults to current time if omitted)",
    )


class PriceLookupResponse(BaseModel):
    product_id: uuid.UUID
    product_name: str
    customer_tier: Optional[str]
    base_price: float
    currency: str
    resolved_price_list_id: uuid.UUID
    resolved_price_list_name: str
    match_strategy: str = Field(
        ...,
        description="Strategy used to resolve price: 'exact_product_tier', 'tier_fallback', or 'default_catalog'",
    )
    as_of_date: datetime
