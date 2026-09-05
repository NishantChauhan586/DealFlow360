from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field
from app.models.subscription import (
    BillingScheduleStatus,
    CreditNoteStatus,
    InvoiceStatus,
    SubscriptionInterval,
    SubscriptionStatus,
)
from app.schemas.product import ProductResponse


# ------------------------------------------------------------------------------
# Subscription Plan Schemas
# ------------------------------------------------------------------------------

class SubscriptionPlanBase(BaseModel):
    product_id: uuid.UUID = Field(..., description="Target catalog subscription product ID")
    interval: SubscriptionInterval = Field(
        default=SubscriptionInterval.MONTHLY, description="Billing cycle interval: monthly, quarterly, yearly"
    )
    interval_count: int = Field(default=1, ge=1, description="Interval multiplier (e.g. 1 month, 3 months)")
    trial_period_days: int = Field(default=0, ge=0, description="Trial period before first invoice")
    cancellation_policy: Dict[str, Any] = Field(
        default_factory=lambda: {"allow_mid_cycle_refund": True, "notice_period_days": 0},
        description="Cancellation & refund rules",
    )


class SubscriptionPlanCreate(SubscriptionPlanBase):
    pass


class SubscriptionPlanResponse(SubscriptionPlanBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    product: Optional[ProductResponse] = None


class SubscriptionPlanListResponse(BaseModel):
    items: List[SubscriptionPlanResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ------------------------------------------------------------------------------
# Invoice & Credit Note Schemas
# ------------------------------------------------------------------------------

class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_id: uuid.UUID
    invoice_number: str
    amount: float
    status: InvoiceStatus
    due_date: datetime
    paid_at: Optional[datetime] = None
    invoice_type: str
    created_at: datetime
    updated_at: datetime


class CreditNoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    subscription_id: Optional[uuid.UUID] = None
    invoice_id: Optional[uuid.UUID] = None
    credit_note_number: str
    amount: float
    reason: str
    status: CreditNoteStatus
    created_at: datetime
    updated_at: datetime


class BillingScheduleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    subscription_id: uuid.UUID
    invoice_date: datetime
    amount_due: float
    status: BillingScheduleStatus
    invoice_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime


# ------------------------------------------------------------------------------
# Subscription Schemas
# ------------------------------------------------------------------------------

class SubscriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_id: uuid.UUID
    customer_id: uuid.UUID
    product_id: uuid.UUID
    plan_id: uuid.UUID
    start_date: datetime
    end_date: Optional[datetime] = None
    status: SubscriptionStatus
    quantity: int
    unit_price: float
    prorated_amount: float
    created_at: datetime
    updated_at: datetime

    plan: Optional[SubscriptionPlanResponse] = None
    product: Optional[ProductResponse] = None
    billing_schedules: List[BillingScheduleResponse] = Field(default_factory=list)


class SubscriptionListResponse(BaseModel):
    items: List[SubscriptionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class SubscriptionQuantityChangeRequest(BaseModel):
    new_quantity: int = Field(..., ge=1, description="New subscribed seat/license quantity")
    idempotency_key: Optional[str] = Field(default=None, description="Idempotency key to guard against duplicate charges")


class SubscriptionQuantityChangeResponse(BaseModel):
    subscription_id: uuid.UUID
    old_quantity: int
    new_quantity: int
    prorated_amount: float
    adjustment_type: str = Field(..., description="'debit' (extra charge) or 'credit' (refund reduction)")
    next_billing_amount: float
    explanation: str


class SubscriptionCancelRequest(BaseModel):
    reason: Optional[str] = Field(default="Customer requested cancellation", max_length=500)


class SubscriptionCancelResponse(BaseModel):
    subscription_id: uuid.UUID
    status: SubscriptionStatus
    refund_amount: float
    credit_note_number: Optional[str] = None
    credit_note_id: Optional[uuid.UUID] = None
    explanation: str


class OrderInvoicesResponse(BaseModel):
    order_id: uuid.UUID
    invoices: List[InvoiceResponse]
    credit_notes: List[CreditNoteResponse]
    total_invoiced: float
    total_credited: float
    net_payable: float
