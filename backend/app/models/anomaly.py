from typing import Optional
from sqlalchemy import String, Integer, Float, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class DealAnomaly(Base, TimestampMixin):
    """
    Compliance and commercial anomaly flag tracked for AI deal health drawer.
    """
    __tablename__ = "deal_anomalies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    quote_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    note: Mapped[str] = mapped_column(Text, nullable=False)
    level: Mapped[str] = mapped_column(String(20), default="Medium", nullable=False) # High, Medium, Low
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class StalledDeal(Base, TimestampMixin):
    """
    Stalled deal entry tracking high velocity risk deals stuck in stage.
    """
    __tablename__ = "stalled_deals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    quote_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    amount: Mapped[str] = mapped_column(String(50), nullable=False) # e.g. $48,200
    days_stalled: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    sales_rep: Mapped[str] = mapped_column(String(255), nullable=False)
