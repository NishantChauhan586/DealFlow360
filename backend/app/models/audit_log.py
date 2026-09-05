from datetime import datetime, timezone
from typing import Optional
import uuid
from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
import sqlalchemy as sa

from app.models.base import Base


class AuditLog(Base):
    """
    Immutable, append-only system audit log tracking state mutations,
    governance decisions, pricing overrides, and lifecycle events across DealFlow360.
    """
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    entity_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    entity_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        nullable=True,
        index=True,
    )
    action: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    old_value: Mapped[dict] = mapped_column(
        JSONB().with_variant(sa.JSON(), "sqlite"),
        nullable=False,
        default=dict,
    )
    new_value: Mapped[dict] = mapped_column(
        JSONB().with_variant(sa.JSON(), "sqlite"),
        nullable=False,
        default=dict,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    reason: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    # Relationships
    user: Mapped[Optional["User"]] = relationship(  # noqa: F821
        "User",
        foreign_keys=[user_id],
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_audit_logs_entity", "entity_type", "entity_id", "timestamp"),
        Index("ix_audit_logs_user_timestamp", "user_id", "timestamp"),
    )

    def __repr__(self) -> str:
        return (
            f"<AuditLog(id={self.id}, entity='{self.entity_type}', "
            f"action='{self.action}', entity_id={self.entity_id})>"
        )
