import enum
from typing import List, Optional
import uuid
from sqlalchemy import (
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


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"


class Order(Base, TimestampMixin):
    """
    Core Order entity generated upon customer quotation confirmation.
    Connects to Warehouse Fulfillment, Billing Schedules, Invoices, and Subscriptions.
    """
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    order_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )
    quotation_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("quotations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        nullable=False,
        index=True,
    )
    sales_rep_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        nullable=True,
        index=True,
    )
    status: Mapped[OrderStatus] = mapped_column(
        Enum(
            OrderStatus,
            name="order_status_enum",
            native_enum=False,
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=False,
        default=OrderStatus.PENDING,
        index=True,
    )
    total_amount: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )
    currency: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="USD",
    )

    # Relationships
    lines: Mapped[List["OrderLine"]] = relationship(
        "OrderLine",
        back_populates="order",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="OrderLine.created_at.asc()",
    )
    quotation: Mapped[Optional["Quotation"]] = relationship(  # noqa: F821
        "Quotation",
        foreign_keys=[quotation_id],
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_orders_customer_status", "customer_id", "status"),
    )

    def __repr__(self) -> str:
        return f"<Order(id={self.id}, number={self.order_number}, customer={self.customer_id}, status={self.status})>"


class OrderLine(Base, TimestampMixin):
    """
    Individual itemized line of an Order with quantity, unit price, and discount calculations.
    """
    __tablename__ = "order_lines"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
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
    order: Mapped["Order"] = relationship(
        "Order",
        back_populates="lines",
    )
    product: Mapped["Product"] = relationship(  # noqa: F821
        "Product",
        foreign_keys=[product_id],
        lazy="selectin",
    )
    variant: Mapped[Optional["ProductVariant"]] = relationship(  # noqa: F821
        "ProductVariant",
        foreign_keys=[variant_id],
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<OrderLine(id={self.id}, order_id={self.order_id}, "
            f"product_id={self.product_id}, qty={self.quantity}, total={self.line_total})>"
        )
