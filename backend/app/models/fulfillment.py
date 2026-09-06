from typing import Optional
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin
from app.models.warehouse import Warehouse  # Re-export canonical warehouse model


class FulfillmentRecord(Base, TimestampMixin):
    """
    Fulfillment & shipment allocation record for a quote across split warehouses.
    """
    __tablename__ = "fulfillment_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    quote_id: Mapped[str] = mapped_column(String(50), ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False)
    warehouse_code: Mapped[str] = mapped_column(String(50), nullable=False)
    allocated_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    shipped_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    backorder_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Allocated", nullable=False)  # Allocated, Partial, Backordered, Shipped
    tracking_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
