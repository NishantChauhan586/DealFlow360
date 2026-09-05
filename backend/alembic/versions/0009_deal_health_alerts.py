"""Create alerts table for deal health monitoring and anomaly detection

Revision ID: 0009_deal_health_alerts
Revises: 0008_customer_portal_orders_and_users
Create Date: 2026-09-05 15:00:00.000000+00:00

"""
from datetime import datetime, timezone
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0009_deal_health_alerts"
down_revision: Union[str, None] = "0008_customer_portal_orders_and_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --------------------------------------------------------------------------
    # 1. Create Alerts Table
    # --------------------------------------------------------------------------
    alerts_table = op.create_table(
        "alerts",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("severity", sa.String(20), server_default="medium", nullable=False),
        sa.Column(
            "quotation_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("quotations.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "order_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("orders.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "details",
            postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"),
            server_default=sa.text("'{}'::jsonb").with_variant(sa.text("'{}'"), "sqlite"),
            nullable=False,
        ),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "resolved_by",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_alerts_id", "alerts", ["id"])
    op.create_index("ix_alerts_type", "alerts", ["type"])
    op.create_index("ix_alerts_severity", "alerts", ["severity"])
    op.create_index("ix_alerts_quotation_id", "alerts", ["quotation_id"])
    op.create_index("ix_alerts_order_id", "alerts", ["order_id"])
    op.create_index("ix_alerts_resolved_at", "alerts", ["resolved_at"])
    op.create_index(
        "ix_alerts_type_severity_resolved",
        "alerts",
        ["type", "severity", "resolved_at"],
    )


def downgrade() -> None:
    op.drop_table("alerts")
