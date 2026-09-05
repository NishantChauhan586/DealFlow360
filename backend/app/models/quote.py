from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import String, Float, Integer, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Quote(Base, TimestampMixin):
    """
    Core Quotation entity tracking customer quotes through the entire lifecycle:
    QUOTE -> RISK -> RECOMMENDATION -> APPROVAL -> FULFILLMENT -> NEGOTIATION -> RE-APPROVAL -> BILLING -> DEAL HEALTH -> CASH
    """
    __tablename__ = "quotes"

    id: Mapped[str] = mapped_column(String(50), primary_key=True) # e.g. Q-1001
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="Quotation")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    currency: Mapped[str] = mapped_column(String(20), default="USD ($)")
    valid_until: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Governance & Operational Status
    # Stages: 'Draft', 'Pending Approval', 'Approved', 'Fulfillment', 'Billed', 'Rejected'
    status: Mapped[str] = mapped_column(String(50), default="Draft", index=True, nullable=False)
    sales_rep: Mapped[str] = mapped_column(String(255), default="S. Adeyemi", nullable=False)
    
    # Financial Totals & Margins (Calculated by Backend Source of Truth)
    subtotal: Mapped[float] = mapped_column(Float, default=0.0)
    discount_percent: Mapped[float] = mapped_column(Float, default=0.0)
    discount_amount: Mapped[float] = mapped_column(Float, default=0.0)
    tax: Mapped[float] = mapped_column(Float, default=0.0)
    grand_total: Mapped[float] = mapped_column(Float, default=0.0)
    
    blended_margin_percent: Mapped[float] = mapped_column(Float, default=0.0)
    risk_score: Mapped[int] = mapped_column(Integer, default=0) # 0 to 100
    risk_level: Mapped[str] = mapped_column(String(20), default="Low") # Low, Medium, High
    required_approval_tier: Mapped[str] = mapped_column(String(50), default="Sales Rep") # Sales Rep, Sales Manager, VP of Sales, CFO
    
    submitted_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    items: Mapped[List["QuoteItem"]] = relationship(
        "QuoteItem", back_populates="quote", cascade="all, delete-orphan", lazy="selectin"
    )
    approval_audits: Mapped[List["ApprovalAudit"]] = relationship(
        "ApprovalAudit", back_populates="quote", cascade="all, delete-orphan", lazy="selectin"
    )


class QuoteItem(Base, TimestampMixin):
    """
    Individual Line Item within a Quote, including category discount ceilings and cost margins.
    """
    __tablename__ = "quote_items"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    quote_id: Mapped[str] = mapped_column(String(50), ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="Hardware", nullable=False) # Hardware, Services, Subscription
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    unit_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    discount_percent: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    line_total: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    
    # Governance Flags
    ceiling_percent: Mapped[float] = mapped_column(Float, default=15.0)
    ceiling_breached: Mapped[bool] = mapped_column(Boolean, default=False)
    overage_percent: Mapped[float] = mapped_column(Float, default=0.0)

    quote: Mapped["Quote"] = relationship("Quote", back_populates="items")


class ApprovalAudit(Base, TimestampMixin):
    """
    Audit Log capturing every approval, rejection, or escalation with explanation context.
    """
    __tablename__ = "approval_audits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    quote_id: Mapped[str] = mapped_column(String(50), ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False)
    approver_name: Mapped[str] = mapped_column(String(255), nullable=False)
    approver_role: Mapped[str] = mapped_column(String(100), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False) # 'approved', 'rejected', 'escalated'
    breached_rule: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    overage_percent: Mapped[float] = mapped_column(Float, default=0.0)
    rationale: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    quote: Mapped["Quote"] = relationship("Quote", back_populates="approval_audits")
