import enum
from typing import List, Optional
import uuid
from sqlalchemy import (
    Boolean,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class FulfillmentSplitStatus(str, enum.Enum):
    PENDING = "pending"
    FULFILLED = "fulfilled"
    BACKORDERED = "backordered"


class Warehouse(Base, TimestampMixin):
    """
    Warehouse entity representing regional distribution centers with associated logistics shipping cost weights.
    """
    __tablename__ = "warehouses"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    address: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    shipping_cost_weight: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=1.0,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )

    # Relationships
    inventory_items: Mapped[List["Inventory"]] = relationship(
        "Inventory",
        back_populates="warehouse",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    fulfillment_splits: Mapped[List["FulfillmentSplit"]] = relationship(
        "FulfillmentSplit",
        back_populates="warehouse",
    )

    def __repr__(self) -> str:
        return f"<Warehouse(id={self.id}, name='{self.name}', weight={self.shipping_cost_weight}, is_active={self.is_active})>"


class Inventory(Base, TimestampMixin):
    """
    Inventory entity tracking on-hand, reserved, and safety reorder thresholds per product per warehouse.
    """
    __tablename__ = "inventory"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    warehouse_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("warehouses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    quantity_on_hand: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    reserved_quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    reorder_point: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=10,
    )

    # Relationships
    warehouse: Mapped["Warehouse"] = relationship(
        "Warehouse",
        back_populates="inventory_items",
        lazy="selectin",
    )
    product: Mapped[Optional["Product"]] = relationship(  # noqa: F821
        "Product",
        lazy="selectin",
    )

    __table_args__ = (
        UniqueConstraint("warehouse_id", "product_id", name="uq_warehouse_product_inventory"),
        Index("ix_inventory_lookup", "product_id", "warehouse_id"),
    )

    @property
    def available_quantity(self) -> int:
        return max(0, self.quantity_on_hand - self.reserved_quantity)

    def __repr__(self) -> str:
        return (
            f"<Inventory(warehouse_id={self.warehouse_id}, product_id={self.product_id}, "
            f"on_hand={self.quantity_on_hand}, reserved={self.reserved_quantity})>"
        )


class FulfillmentSplit(Base, TimestampMixin):
    """
    FulfillmentSplit entity tracking warehouse-specific quantity allocations and backorder records for an order.
    """
    __tablename__ = "fulfillment_splits"

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
    product_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    warehouse_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("warehouses.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    allocated_quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    shipping_cost: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )
    status: Mapped[FulfillmentSplitStatus] = mapped_column(
        Enum(
            FulfillmentSplitStatus,
            name="fulfillment_split_status_enum",
            native_enum=False,
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=False,
        default=FulfillmentSplitStatus.PENDING,
        index=True,
    )

    # Relationships
    warehouse: Mapped[Optional["Warehouse"]] = relationship(
        "Warehouse",
        back_populates="fulfillment_splits",
        lazy="selectin",
    )
    product: Mapped[Optional["Product"]] = relationship(  # noqa: F821
        "Product",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_fulfillment_splits_order", "order_id", "status"),
    )

    def __repr__(self) -> str:
        return (
            f"<FulfillmentSplit(id={self.id}, order_id={self.order_id}, "
            f"warehouse_id={self.warehouse_id}, qty={self.allocated_quantity}, status='{self.status}')>"
        )
