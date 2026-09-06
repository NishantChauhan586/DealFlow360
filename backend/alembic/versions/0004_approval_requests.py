"""Create approval_requests table

Revision ID: 0004_approval_requests
Revises: 0003_quotation_and_lines
Create Date: 2026-09-05 12:30:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0004_approval_requests"
down_revision: Union[str, None] = "0003_quotation_and_lines"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "approval_requests",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "quotation_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("quotations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("step_order", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("role_required", sa.String(50), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("assigned_to", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("decision_by", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_approval_requests_id", "approval_requests", ["id"])
    op.create_index(
        "ix_approval_requests_quotation_id", "approval_requests", ["quotation_id"]
    )
    op.create_index(
        "ix_approval_requests_status", "approval_requests", ["status"]
    )
    op.create_index(
        "ix_approval_requests_quote_step",
        "approval_requests",
        ["quotation_id", "step_order"],
    )


def downgrade() -> None:
    op.drop_table("approval_requests")
