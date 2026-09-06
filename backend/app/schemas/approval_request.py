from datetime import datetime
import enum
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field
from app.models.approval_request import ApprovalStepStatus
from app.models.quotation import QuotationStatus


class RiskLevel(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


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
    requested_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    reason: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


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


from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing import Any, List, Optional

class BRSCalculationResponse(BaseModel):
    quotation_id: uuid.UUID
    customer_tier: str = "gold"
    gross_total: float = 0.0
    discount_total: float = 0.0
    overall_discount_percent: float = 0.0
    overall_tier_cap: float = 15.0
    tier_cap_penalty: float = 0.0
    blended_risk_score: float = 0.0
    risk_level: str = Field(default="Low", description="'Low' (0-5), 'Medium' (5-15), or 'High' (>15)")
    lines_breakdown: List[BRSLineBreakdown] = Field(default_factory=list)
    explanation: str = ""

    @model_validator(mode="before")
    @classmethod
    def remap_legacy_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "score" in data and "blended_risk_score" not in data:
                data["blended_risk_score"] = data["score"]
            if "total_discount_percent" in data and "overall_discount_percent" not in data:
                data["overall_discount_percent"] = data["total_discount_percent"]
            if "governance_explanation" in data and "explanation" not in data:
                data["explanation"] = data["governance_explanation"]
            if "line_breakdowns" in data and "lines_breakdown" not in data:
                data["lines_breakdown"] = data["line_breakdowns"]
            if "overall_tier_cap_percent" in data and "overall_tier_cap" not in data:
                data["overall_tier_cap"] = data["overall_tier_cap_percent"]
        return data

    @property
    def score(self) -> float:
        return self.blended_risk_score

    @property
    def governance_explanation(self) -> str:
        return self.explanation


class ApprovalRoutingResultResponse(BaseModel):
    quotation_id: uuid.UUID
    status: QuotationStatus
    blended_risk_score: float
    risk_level: str
    approval_required: bool
    steps: List[ApprovalRequestResponse]
    explanation: str

    @property
    def quotation_status(self) -> QuotationStatus:
        return self.status

    @property
    def approval_requests(self) -> List[ApprovalRequestResponse]:
        return self.steps
