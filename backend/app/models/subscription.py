from typing import Optional
from sqlalchemy import String, Float, Integer, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class SubscriptionContract(Base, TimestampMixin):
    """
    Subscription & Recurring Billing contract entity created upon quote finalization.
    Tracks MRR, ARR, billing frequencies, and proration states.
    """
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    quote_id: Mapped[str] = mapped_column(String(50), ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False)
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_email: Mapped[str] = mapped_column(String(255), nullable=False)
    billing_frequency: Mapped[str] = mapped_column(String(50), default="Monthly", nullable=False) # Monthly, Annual
    mrr_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    arr_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    one_time_charges: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Active", nullable=False) # Active, Pending, Cancelled
    start_date: Mapped[str] = mapped_column(String(50), nullable=False)
    renewal_date: Mapped[str] = mapped_column(String(50), nullable=False)
