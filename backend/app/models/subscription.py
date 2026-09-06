from datetime import datetime
import enum
from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class SubscriptionContract(Base, TimestampMixin):
    """
    Subscription & Recurring Billing contract entity created upon quote finalization.
    Tracks MRR, ARR, billing frequencies, and proration states.
    """
    __tablename__ = "quote_subscription_contracts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    quote_id: Mapped[str] = mapped_column(String(50), ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False)
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_email: Mapped[str] = mapped_column(String(255), nullable=False)
    billing_frequency: Mapped[str] = mapped_column(String(50), default="Monthly", nullable=False)  # Monthly, Annual
    mrr_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    arr_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    one_time_charges: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Active", nullable=False)  # Active, Pending, Cancelled
    start_date: Mapped[str] = mapped_column(String(50), nullable=False)
    renewal_date: Mapped[str] = mapped_column(String(50), nullable=False)


class SubscriptionInterval(str, enum.Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"



class BillingScheduleStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    OPEN = "open"
    PENDING = "pending"
    PAID = "paid"
    VOID = "void"
    UNCOLLECTIBLE = "uncollectible"


class CreditNoteStatus(str, enum.Enum):
    ISSUED = "issued"
    APPLIED = "applied"
    REFUNDED = "refunded"


class SubscriptionPlan(Base, TimestampMixin):
    """
    SubscriptionPlan entity defining recurring intervals, trial period, and cancellation policies.
    """
    __tablename__ = "subscription_plans"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    interval: Mapped[SubscriptionInterval] = mapped_column(
        Enum(
            SubscriptionInterval,
            name="subscription_interval_enum",
            native_enum=False,
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=False,
        default=SubscriptionInterval.MONTHLY,
    )
    interval_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )
    trial_period_days: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    cancellation_policy: Mapped[Dict[str, Any]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=False,
        default=dict,
    )

    # Relationships
    product: Mapped[Optional["Product"]] = relationship(  # noqa: F821
        "Product",
        lazy="selectin",
    )
    subscriptions: Mapped[List["Subscription"]] = relationship(
        "Subscription",
        back_populates="plan",
    )

    def __repr__(self) -> str:
        return (
            f"<SubscriptionPlan(id={self.id}, product_id={self.product_id}, "
            f"interval='{self.interval}', interval_count={self.interval_count})>"
        )


class Subscription(Base, TimestampMixin):
    """
    Active Subscription contract instance linked to an order, customer, and recurring plan.
    """
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        nullable=False,
        index=True,
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        nullable=False,
        index=True,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("subscription_plans.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    start_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    end_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(
            SubscriptionStatus,
            name="subscription_status_enum",
            native_enum=False,
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=False,
        default=SubscriptionStatus.ACTIVE,
        index=True,
    )
    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )
    unit_price: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )
    prorated_amount: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )

    # Relationships
    plan: Mapped["SubscriptionPlan"] = relationship(
        "SubscriptionPlan",
        back_populates="subscriptions",
        lazy="selectin",
    )
    product: Mapped[Optional["Product"]] = relationship(  # noqa: F821
        "Product",
        lazy="selectin",
    )
    billing_schedules: Mapped[List["BillingSchedule"]] = relationship(
        "BillingSchedule",
        back_populates="subscription",
        cascade="all, delete-orphan",
        order_by="BillingSchedule.invoice_date.asc()",
        lazy="selectin",
    )
    credit_notes: Mapped[List["CreditNote"]] = relationship(
        "CreditNote",
        back_populates="subscription",
    )

    __table_args__ = (
        Index("ix_subscriptions_cust_status", "customer_id", "status"),
        Index("ix_subscriptions_order", "order_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<Subscription(id={self.id}, customer_id={self.customer_id}, "
            f"plan_id={self.plan_id}, qty={self.quantity}, status='{self.status}')>"
        )


class Invoice(Base, TimestampMixin):
    """
    Invoice entity representing one-time or recurring billing demands.
    """
    __tablename__ = "invoices"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        nullable=False,
        index=True,
    )
    invoice_number: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )
    amount: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )
    status: Mapped[InvoiceStatus] = mapped_column(
        Enum(
            InvoiceStatus,
            name="invoice_status_enum",
            native_enum=False,
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=False,
        default=InvoiceStatus.OPEN,
        index=True,
    )
    due_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    paid_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    invoice_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="one_time",
    )

    # Relationships
    billing_schedules: Mapped[List["BillingSchedule"]] = relationship(
        "BillingSchedule",
        back_populates="invoice",
    )
    credit_notes: Mapped[List["CreditNote"]] = relationship(
        "CreditNote",
        back_populates="invoice",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Invoice(id={self.id}, number='{self.invoice_number}', amount={self.amount}, status='{self.status}')>"


class BillingSchedule(Base, TimestampMixin):
    """
    BillingSchedule entity governing point-in-time invoice triggering for active subscriptions.
    """
    __tablename__ = "billing_schedules"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    subscription_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("subscriptions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    invoice_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    amount_due: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    status: Mapped[BillingScheduleStatus] = mapped_column(
        Enum(
            BillingScheduleStatus,
            name="billing_schedule_status_enum",
            native_enum=False,
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=False,
        default=BillingScheduleStatus.PENDING,
        index=True,
    )
    invoice_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("invoices.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationships
    subscription: Mapped["Subscription"] = relationship(
        "Subscription",
        back_populates="billing_schedules",
        lazy="selectin",
    )
    invoice: Mapped[Optional["Invoice"]] = relationship(
        "Invoice",
        back_populates="billing_schedules",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<BillingSchedule(id={self.id}, subscription_id={self.subscription_id}, "
            f"date={self.invoice_date}, amount={self.amount_due}, status='{self.status}')>"
        )


class CreditNote(Base, TimestampMixin):
    """
    CreditNote entity capturing mid-cycle cancellation refunds, proration credits, or billing adjustments.
    """
    __tablename__ = "credit_notes"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    subscription_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("subscriptions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    invoice_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("invoices.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    credit_note_number: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )
    amount: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    reason: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    status: Mapped[CreditNoteStatus] = mapped_column(
        Enum(
            CreditNoteStatus,
            name="credit_note_status_enum",
            native_enum=False,
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=False,
        default=CreditNoteStatus.ISSUED,
        index=True,
    )

    # Relationships
    subscription: Mapped[Optional["Subscription"]] = relationship(
        "Subscription",
        back_populates="credit_notes",
        lazy="selectin",
    )
    invoice: Mapped[Optional["Invoice"]] = relationship(
        "Invoice",
        back_populates="credit_notes",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<CreditNote(id={self.id}, number='{self.credit_note_number}', "
            f"amount={self.amount}, status='{self.status}')>"
        )

