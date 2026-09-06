from datetime import datetime
import enum
from typing import Optional
import uuid
from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
    Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
import sqlalchemy as sa

from app.models.base import Base, TimestampMixin


class AlertType(str, enum.Enum):
    STALLED = "stalled"
    DISCOUNT_ANOMALY = "discount_anomaly"
    DELIVERY_PROMISE = "delivery_promise"


class AlertSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Alert(Base, TimestampMixin):
    """
    Alert entity tracking deal health anomalies, stalled sales quotations,
    and fulfillment delivery slippage risks.
    """
    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    type: Mapped[AlertType] = mapped_column(
        Enum(
            AlertType,
            name="alert_type_enum",
            native_enum=False,
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=False,
        index=True,
    )
    severity: Mapped[AlertSeverity] = mapped_column(
        Enum(
            AlertSeverity,
            name="alert_severity_enum",
            native_enum=False,
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=False,
        default=AlertSeverity.MEDIUM,
        index=True,
    )
    quotation_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("quotations.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    order_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("orders.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    details: Mapped[dict] = mapped_column(
        JSONB().with_variant(sa.JSON(), "sqlite"),
        nullable=False,
        default=dict,
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
    resolved_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    quotation: Mapped[Optional["Quotation"]] = relationship(  # noqa: F821
        "Quotation",
        foreign_keys=[quotation_id],
        lazy="selectin",
    )
    order: Mapped[Optional["Order"]] = relationship(  # noqa: F821
        "Order",
        foreign_keys=[order_id],
        lazy="selectin",
    )
    resolver: Mapped[Optional["User"]] = relationship(  # noqa: F821
        "User",
        foreign_keys=[resolved_by],
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_alerts_type_severity_resolved", "type", "severity", "resolved_at"),
    )

    def __repr__(self) -> str:
        return f"<Alert(id={self.id}, type='{self.type}', severity='{self.severity}', resolved={self.resolved_at is not None})>"
