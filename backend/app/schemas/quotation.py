from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field
from app.models.quotation import QuotationStatus
from app.schemas.product import ProductResponse, ProductVariantResponse


# ------------------------------------------------------------------------------
# Quotation Line Schemas
# ------------------------------------------------------------------------------

class QuotationLineBase(BaseModel):
    product_id: uuid.UUID = Field(..., description="Target catalog product ID")
    variant_id: Optional[uuid.UUID] = Field(default=None, description="Optional specific product variant ID")
    quantity: int = Field(default=1, ge=1, description="Quantity of units requested")
    unit_price: Optional[float] = Field(default=None, ge=0.0, description="Unit price (auto-resolved if omitted)")
    discount_percent: float = Field(default=0.0, ge=0.0, le=100.0, description="Discount percentage applied to this line")


class QuotationLineCreate(QuotationLineBase):
    pass


class QuotationLineUpdate(BaseModel):
    quantity: Optional[int] = Field(default=None, ge=1)
    unit_price: Optional[float] = Field(default=None, ge=0.0)
    discount_percent: Optional[float] = Field(default=None, ge=0.0, le=100.0)


class QuotationLineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    quotation_id: uuid.UUID
    product_id: uuid.UUID
    variant_id: Optional[uuid.UUID]
    quantity: int
    unit_price: float
    discount_percent: float
    line_total: float
    margin_percent: float
    created_at: datetime
    updated_at: datetime

    product: Optional[ProductResponse] = None
    variant: Optional[ProductVariantResponse] = None


# ------------------------------------------------------------------------------
# Quotation Schemas
# ------------------------------------------------------------------------------

class QuotationBase(BaseModel):
    customer_id: uuid.UUID = Field(..., description="Target customer or account ID")
    expires_at: Optional[datetime] = Field(default=None, description="Quote validity expiration timestamp")


class QuotationCreate(QuotationBase):
    sales_rep_id: Optional[uuid.UUID] = Field(
        default=None,
        description="Sales representative ID (auto-populated from authenticated context if omitted)",
    )
    lines: List[QuotationLineCreate] = Field(default_factory=list, description="Initial line items")


class QuotationUpdate(BaseModel):
    customer_id: Optional[uuid.UUID] = None
    expires_at: Optional[datetime] = None
    status: Optional[QuotationStatus] = None


class QuotationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    customer_id: uuid.UUID
    sales_rep_id: uuid.UUID
    status: QuotationStatus
    total_amount: float
    discount_total: float
    blended_risk_score: Optional[float]
    expires_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    lines: List[QuotationLineResponse] = Field(default_factory=list)


class QuotationListResponse(BaseModel):
    items: List[QuotationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
