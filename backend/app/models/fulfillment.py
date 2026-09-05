from typing import Optional
from sqlalchemy import String, Integer, Float, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Warehouse(Base, TimestampMixin):
    """
    Warehouse location entity tracking inventory stock levels across global fulfillment nodes.
    Codes: 'US-East', 'EU-Central', 'APAC'
    """
    __tablename__ = "warehouses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False) # e.g. US-East
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    available_units: Mapped[int] = mapped_column(Integer, default=1000, nullable=False)
    reserved_units: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


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
    status: Mapped[str] = mapped_column(String(50), default="Allocated", nullable=False) # Allocated, Partial, Backordered, Shipped
    tracking_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
