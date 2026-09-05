from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

base_config = ConfigDict(
    from_attributes=True,
    populate_by_name=True,
    alias_generator=to_camel,
)


class QuoteItemBase(BaseModel):
    model_config = base_config

    name: str
    category: str = "Hardware"
    quantity: int = Field(default=1, ge=1)
    unit_price: float = Field(default=0.0, ge=0)
    unit_cost: float = Field(default=0.0, ge=0)
    discount_percent: float = Field(default=0.0, ge=0, le=100)
    product_id: Optional[str] = None


class QuoteItemCreate(QuoteItemBase):
    pass


class QuoteItemResponse(QuoteItemBase):
    id: str
    quote_id: str
    line_total: float
    ceiling_percent: float
    ceiling_breached: bool
    overage_percent: float


class ApprovalAuditResponse(BaseModel):
    model_config = base_config

    id: int
    quote_id: str
    approver_name: str
    approver_role: str
    action: str
    breached_rule: Optional[str] = None
    overage_percent: float = 0.0
    rationale: Optional[str] = None
    created_at: str


class GovernanceExplanation(BaseModel):
    """
    Standard Rule Explanation adhering to DealFlow360 Principle:
    EXPLAIN EVERY IMPORTANT DECISION
    - WHAT happened
    - WHY it happened
    - WHAT happens next
    """
    model_config = base_config

    what: str
    why: str
    what_next: str
    requires_approval: bool
    risk_level: str
    risk_score: int
    required_tier: str


class QuoteCreate(BaseModel):
    model_config = base_config

    customer_name: str
    customer_email: str
    company_name: str
    title: str = "Quotation"
    description: Optional[str] = ""
    currency: str = "USD ($)"
    valid_until: Optional[str] = None
    discount_percent: float = Field(default=0.0, ge=0, le=100)
    line_items: List[QuoteItemCreate] = []


class QuoteUpdate(BaseModel):
    model_config = base_config

    title: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    company_name: Optional[str] = None
    description: Optional[str] = None
    currency: Optional[str] = None
    valid_until: Optional[str] = None
    discount_percent: Optional[float] = None
    status: Optional[str] = None
    line_items: Optional[List[QuoteItemCreate]] = None


class QuoteResponse(BaseModel):
    model_config = base_config

    id: str
    customer_name: str
    customer_email: str
    company_name: str
    title: str
    description: Optional[str] = None
    currency: str
    valid_until: Optional[str] = None
    status: str
    sales_rep: str
    subtotal: float
    discount_percent: float
    discount_amount: float
    tax: float
    grand_total: float
    blended_margin_percent: float
    risk_score: int
    risk_level: str
    required_approval_tier: str
    submitted_at: Optional[str] = None
    line_items: List[QuoteItemResponse] = []
    approval_audits: List[ApprovalAuditResponse] = []
    explanation: Optional[GovernanceExplanation] = None


class ApprovalDecisionRequest(BaseModel):
    model_config = base_config

    approver_name: str
    approver_role: str
    action: str  # 'approved' or 'rejected'
    rationale: Optional[str] = ""

