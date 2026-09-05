from typing import Any, Dict, List
import uuid
from sqlalchemy import Boolean, Index, String, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class ApprovalChain(Base, TimestampMixin):
    """
    ApprovalChain entity determining the sequential multi-role signoff hierarchy triggered by deal risk metrics.
    """
    __tablename__ = "approval_chains"

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
    trigger_condition: Mapped[Dict[str, Any]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=False,
        default=dict,
    )
    sequence: Mapped[List[str]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=False,
        default=list,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )

    __table_args__ = (
        Index("ix_approval_chains_active", "is_active"),
    )

    def __repr__(self) -> str:
        return (
            f"<ApprovalChain(id={self.id}, name='{self.name}', "
            f"sequence={self.sequence}, is_active={self.is_active})>"
        )
