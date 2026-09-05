import uuid
from sqlalchemy import Enum, Float, Index, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin
from app.models.product import ProductCategory


class DiscountTier(Base, TimestampMixin):
    """
    DiscountTier entity governing deterministic discount ceilings by customer tier and product category.
    """
    __tablename__ = "discount_tiers"

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
    customer_tier: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    category: Mapped[ProductCategory] = mapped_column(
        Enum(
            ProductCategory,
            name="product_category_enum",
            native_enum=False,
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=False,
        index=True,
    )
    max_discount_percent: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )

    __table_args__ = (
        UniqueConstraint("customer_tier", "category", name="uq_discount_tier_category"),
        Index("ix_discount_tier_lookup", "customer_tier", "category"),
    )

    def __repr__(self) -> str:
        return (
            f"<DiscountTier(id={self.id}, tier='{self.customer_tier}', "
            f"category='{self.category}', max_discount={self.max_discount_percent}%)>"
        )
