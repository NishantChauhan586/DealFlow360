from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field

from app.models.product import ProductCategory


class ProductPairingBase(BaseModel):
    source_product_id: uuid.UUID = Field(..., description="Source product present in cart")
    target_product_id: uuid.UUID = Field(..., description="Suggested upsell / cross-sell product")
    co_purchase_score: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Historical co-purchase affinity score between 0.0 and 1.0",
    )
    is_promoted: bool = Field(
        default=False,
        description="Strategic enterprise promotion flag (prioritized in suggestion rankings)",
    )
    min_margin_threshold: float = Field(
        default=0.0,
        ge=0.0,
        le=100.0,
        description="Minimum margin percentage required to qualify suggestion for display",
    )


class ProductPairingCreate(ProductPairingBase):
    pass


class ProductPairingUpdate(BaseModel):
    co_purchase_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    is_promoted: Optional[bool] = None
    min_margin_threshold: Optional[float] = Field(None, ge=0.0, le=100.0)


class ProductPairingResponse(ProductPairingBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UpsellSuggestionItem(BaseModel):
    pairing_id: uuid.UUID
    source_product_id: uuid.UUID
    source_product_name: str
    product_id: uuid.UUID
    product_name: str
    product_category: ProductCategory
    product_description: Optional[str] = None
    unit: str
    base_price: float
    cost_estimate: float
    margin_dollars: float
    margin_percent: float
    margin_delta: float
    co_purchase_score: float
    is_promoted: bool
    reason: str


class UpsellSuggestionsResponse(BaseModel):
    quotation_id: uuid.UUID
    cart_product_count: int
    total_suggestions: int
    suggestions: List[UpsellSuggestionItem]
