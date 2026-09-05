from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field
from app.models.approval_request import ApprovalStepStatus
from app.models.quotation import QuotationStatus


# ------------------------------------------------------------------------------
# Approval Request & Step Schemas
# ------------------------------------------------------------------------------

class ApprovalRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    quotation_id: uuid.UUID
    step_order: int
    role_required: str
    status: ApprovalStepStatus
    assigned_to: Optional[uuid.UUID] = None
    decision_by: Optional[uuid.UUID] = None
    requested_at: datetime
    completed_at: Optional[datetime] = None
    reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ApprovalActionRequest(BaseModel):
    step_id: uuid.UUID = Field(..., description="Target approval step ID to act upon")
    action: str = Field(..., pattern="^(approve|reject|return)$", description="Action: 'approve', 'reject', or 'return'")
    reason: Optional[str] = Field(default=None, max_length=1000, description="Decision justification or feedback note")


# ------------------------------------------------------------------------------
# BRS Calculation & Risk Breakdown Schemas
# ------------------------------------------------------------------------------

class BRSLineBreakdown(BaseModel):
    line_id: uuid.UUID
    product_name: str
    category: str
    discount_given: float
    allowed_discount: float
    excess: float
    weight: float
    line_score: float


class BRSCalculationResponse(BaseModel):
    quotation_id: uuid.UUID
    customer_tier: str
    gross_total: float
    discount_total: float
    overall_discount_percent: float
    overall_tier_cap: float
    tier_cap_penalty: float
    blended_risk_score: float
    risk_level: str = Field(..., description="'Low' (0-5), 'Medium' (5-15), or 'High' (>15)")
    lines_breakdown: List[BRSLineBreakdown]
    explanation: str


class ApprovalRoutingResultResponse(BaseModel):
    quotation_id: uuid.UUID
    status: QuotationStatus
    blended_risk_score: float
    risk_level: str
    approval_required: bool
    steps: List[ApprovalRequestResponse]
    explanation: str
