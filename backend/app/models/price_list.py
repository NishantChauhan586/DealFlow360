from datetime import datetime
from typing import Optional
import uuid
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    String,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin


class PriceList(Base, TimestampMixin):
    """
    PriceList entity governing base pricing across customer tiers, specific products, and effective time windows.
    """
    __tablename__ = "price_lists"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    currency: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="USD",
    )
    customer_tier: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        index=True,
    )
    product_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    base_price: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    effective_from: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    effective_to: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    # Relationships
    product: Mapped[Optional["Product"]] = relationship(  # noqa: F821
        "Product",
        back_populates="price_entries",
    )

    __table_args__ = (
        CheckConstraint(
            "effective_to IS NULL OR effective_from < effective_to",
            name="check_effective_date_range",
        ),
        Index("ix_price_lists_lookup", "product_id", "customer_tier", "effective_from", "effective_to"),
    )

    def __repr__(self) -> str:
        return (
            f"<PriceList(id={self.id}, name='{self.name}', tier='{self.customer_tier}', "
            f"product_id={self.product_id}, base_price={self.base_price})>"
        )
