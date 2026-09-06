from typing import Optional
import uuid
from sqlalchemy import (
    Boolean,
    Float,
    ForeignKey,
    Index,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class ProductPairing(Base, TimestampMixin):
    """
    Product Pairing entity defining co-purchase relationships, upsell affinity scores,
    and minimum margin governance thresholds.
    """
    __tablename__ = "product_pairings"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    source_product_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_product_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    co_purchase_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.5,
    )
    is_promoted: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )
    min_margin_threshold: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )

    # Relationships
    source_product: Mapped["Product"] = relationship(  # noqa: F821
        "Product",
        foreign_keys=[source_product_id],
        lazy="joined",
    )
    target_product: Mapped["Product"] = relationship(  # noqa: F821
        "Product",
        foreign_keys=[target_product_id],
        lazy="joined",
    )

    __table_args__ = (
        UniqueConstraint(
            "source_product_id",
            "target_product_id",
            name="uq_product_pairings_source_target",
        ),
        Index("ix_product_pairings_source_promoted", "source_product_id", "is_promoted", "co_purchase_score"),
    )

    def __repr__(self) -> str:
        return (
            f"<ProductPairing(source={self.source_product_id}, "
            f"target={self.target_product_id}, score={self.co_purchase_score}, "
            f"promoted={self.is_promoted})>"
        )
