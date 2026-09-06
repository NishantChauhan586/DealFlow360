import enum
from datetime import datetime
from typing import List, Optional
import uuid
from sqlalchemy import (
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class QuotationStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    SENT_TO_CUSTOMER = "sent_to_customer"
    UNDER_NEGOTIATION = "under_negotiation"
    CONFIRMED = "confirmed"
    CONVERTED = "converted"


class Quotation(Base, TimestampMixin):
    """
    Core Quotation entity governing pricing, discounts, risk score, and lifecycle states.
    """
    __tablename__ = "quotations"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        nullable=False,
        index=True,
    )
    sales_rep_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        nullable=False,
        index=True,
    )
    status: Mapped[QuotationStatus] = mapped_column(
        Enum(
            QuotationStatus,
            name="quotation_status_enum",
            native_enum=False,
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=False,
        default=QuotationStatus.DRAFT,
        index=True,
    )
    total_amount: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )
    discount_total: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )
    blended_risk_score: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    lines: Mapped[List["QuotationLine"]] = relationship(
        "QuotationLine",
        back_populates="quotation",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="QuotationLine.created_at.asc()",
    )
    approvals: Mapped[List["ApprovalRequest"]] = relationship(  # noqa: F821
        "ApprovalRequest",
        back_populates="quotation",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="ApprovalRequest.step_order.asc()",
    )

    __table_args__ = (
        Index("ix_quotations_rep_status", "sales_rep_id", "status"),
        Index("ix_quotations_cust_status", "customer_id", "status"),
    )

    def __repr__(self) -> str:
        return (
            f"<Quotation(id={self.id}, status='{self.status}', "
            f"total={self.total_amount}, risk={self.blended_risk_score})>"
        )


class QuotationLine(Base, TimestampMixin):
    """
    Individual line item in a Quotation representing a product or variant, quantity, unit price, and discount.
    """
    __tablename__ = "quotation_lines"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    quotation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("quotations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    variant_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("product_variants.id", ondelete="SET NULL"),
        nullable=True,
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
    )
    discount_percent: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )
    line_total: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )
    margin_percent: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )

    # Relationships
    quotation: Mapped["Quotation"] = relationship(
        "Quotation",
        back_populates="lines",
    )
    product: Mapped[Optional["Product"]] = relationship(  # noqa: F821
        "Product",
        lazy="selectin",
    )
    variant: Mapped[Optional["ProductVariant"]] = relationship(  # noqa: F821
        "ProductVariant",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<QuotationLine(id={self.id}, quote_id={self.quotation_id}, "
            f"product_id={self.product_id}, qty={self.quantity}, total={self.line_total})>"
        )
