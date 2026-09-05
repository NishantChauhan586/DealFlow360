from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field
from app.models.product import ProductCategory


class DiscountTierBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Rule label (e.g. 'Silver - Hardware Max Discount')")
    customer_tier: str = Field(..., min_length=1, max_length=50, description="Target customer tier: bronze, silver, gold, enterprise")
    category: ProductCategory = Field(..., description="Product category: hardware, service, subscription")
    max_discount_percent: float = Field(..., ge=0.0, le=100.0, description="Upper ceiling allowed discount percentage (0 to 100)")


class DiscountTierCreate(DiscountTierBase):
    pass


class DiscountTierUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    customer_tier: Optional[str] = Field(default=None, min_length=1, max_length=50)
    category: Optional[ProductCategory] = None
    max_discount_percent: Optional[float] = Field(default=None, ge=0.0, le=100.0)


class DiscountTierResponse(DiscountTierBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class DiscountTierListResponse(BaseModel):
    items: List[DiscountTierResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class DiscountLimitLookupResponse(BaseModel):
    customer_tier: str
    category: ProductCategory
    max_discount_percent: float
    matched_tier_id: Optional[uuid.UUID]
    matched_tier_name: Optional[str]
    rule_applied: str
