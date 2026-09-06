"""Create audit_logs table for immutable system audit trails

Revision ID: 0010_audit_logs
Revises: 0009_deal_health_alerts
Create Date: 2026-09-05 15:30:00.000000+00:00

"""
from datetime import datetime, timezone
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0010_audit_logs"
down_revision: Union[str, None] = "0009_deal_health_alerts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --------------------------------------------------------------------------
    # 1. Create audit_logs Table
    # --------------------------------------------------------------------------
    audit_logs_table = op.create_table(
        "audit_logs",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column(
            "old_value",
            postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"),
            server_default=sa.text("'{}'::jsonb").with_variant(sa.text("'{}'"), "sqlite"),
            nullable=False,
        ),
        sa.Column(
            "new_value",
            postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"),
            server_default=sa.text("'{}'::jsonb").with_variant(sa.text("'{}'"), "sqlite"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_audit_logs_id", "audit_logs", ["id"])
    op.create_index("ix_audit_logs_entity_type", "audit_logs", ["entity_type"])
    op.create_index("ix_audit_logs_entity_id", "audit_logs", ["entity_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_timestamp", "audit_logs", ["timestamp"])
    op.create_index(
        "ix_audit_logs_entity",
        "audit_logs",
        ["entity_type", "entity_id", "timestamp"],
    )
    op.create_index(
        "ix_audit_logs_user_timestamp",
        "audit_logs",
        ["user_id", "timestamp"],
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
