from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field

from app.models.quotation import QuotationStatus
from app.schemas.approval_request import BRSCalculationResponse
from app.schemas.quotation import QuotationLineResponse, QuotationResponse


class NegotiationLineChange(BaseModel):
    line_id: uuid.UUID = Field(..., description="Quotation line UUID to negotiate")
    new_discount: Optional[float] = Field(
        None,
        ge=0.0,
        le=100.0,
        description="Customer requested discount percentage (0-100%)",
    )
    new_quantity: Optional[int] = Field(
        None,
        ge=1,
        description="Customer requested adjusted quantity (>= 1)",
    )


class QuotationNegotiationRequest(BaseModel):
    line_changes: Optional[List[NegotiationLineChange]] = Field(
        default=None,
        description="Itemized discount and quantity adjustments",
    )
    overall_discount: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="Optional uniform discount percentage across all lines",
    )
    counter_offer_notes: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Customer explanation / justification for counter-offer",
    )


class QuotationNegotiationResponse(BaseModel):
    quotation_id: uuid.UUID
    previous_total: float
    new_total: float
    previous_discount_total: float
    new_discount_total: float
    quotation_status: QuotationStatus
    requires_approval: bool
    governance_action: str
    governance_explanation: str
    risk_assessment: BRSCalculationResponse
    updated_quotation: QuotationResponse


class CustomerQuotationSummary(BaseModel):
    id: uuid.UUID
    customer_id: uuid.UUID
    sales_rep_id: uuid.UUID
    status: QuotationStatus
    total_amount: float
    discount_total: float
    blended_risk_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    expires_at: Optional[datetime] = None
    line_count: int

    model_config = ConfigDict(from_attributes=True)


class CustomerQuotationListResponse(BaseModel):
    items: List[CustomerQuotationSummary]
    total: int
    page: int
    page_size: int
