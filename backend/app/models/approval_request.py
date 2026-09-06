from datetime import datetime
import enum
from typing import Optional
import uuid
from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class ApprovalStepStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    RETURNED = "returned"


class ApprovalRequest(Base, TimestampMixin):
    """
    ApprovalRequest entity tracking step-by-step signoffs in a governance workflow.
    """
    __tablename__ = "approval_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    quotation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("quotations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    step_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )
    role_required: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    status: Mapped[ApprovalStepStatus] = mapped_column(
        Enum(
            ApprovalStepStatus,
            name="approval_step_status_enum",
            native_enum=False,
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=False,
        default=ApprovalStepStatus.PENDING,
        index=True,
    )
    assigned_to: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        nullable=True,
    )
    decision_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        nullable=True,
    )
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(),
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    reason: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Relationships
    quotation: Mapped["Quotation"] = relationship(  # noqa: F821
        "Quotation",
        back_populates="approvals",
    )

    __table_args__ = (
        Index("ix_approval_requests_quote_step", "quotation_id", "step_order"),
    )

    def __repr__(self) -> str:
        return (
            f"<ApprovalRequest(id={self.id}, quote_id={self.quotation_id}, "
            f"step={self.step_order}, role='{self.role_required}', status='{self.status}')>"
        )
