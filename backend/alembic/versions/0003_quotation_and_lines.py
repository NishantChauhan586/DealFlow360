"""Create quotations and quotation lines tables

Revision ID: 0003_quotation_and_lines
Revises: 0002_discount_and_approval_chains
Create Date: 2026-09-05 12:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0003_quotation_and_lines"
down_revision: Union[str, None] = "0002_discount_and_approval_chains"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create quotations table
    op.create_table(
        "quotations",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("customer_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("sales_rep_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="draft"),
        sa.Column("total_amount", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("discount_total", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("blended_risk_score", sa.Float(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_quotations_id", "quotations", ["id"])
    op.create_index("ix_quotations_customer_id", "quotations", ["customer_id"])
    op.create_index("ix_quotations_sales_rep_id", "quotations", ["sales_rep_id"])
    op.create_index("ix_quotations_status", "quotations", ["status"])
    op.create_index(
        "ix_quotations_rep_status", "quotations", ["sales_rep_id", "status"]
    )
    op.create_index(
        "ix_quotations_cust_status", "quotations", ["customer_id", "status"]
    )

    # 2. Create quotation_lines table
    op.create_table(
        "quotation_lines",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "quotation_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("quotations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "product_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("products.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "variant_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("product_variants.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("unit_price", sa.Float(), nullable=False),
        sa.Column("discount_percent", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("line_total", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("margin_percent", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_quotation_lines_id", "quotation_lines", ["id"])
    op.create_index(
        "ix_quotation_lines_quotation_id", "quotation_lines", ["quotation_id"]
    )
    op.create_index(
        "ix_quotation_lines_product_id", "quotation_lines", ["product_id"]
    )
    op.create_index(
        "ix_quotation_lines_variant_id", "quotation_lines", ["variant_id"]
    )


def downgrade() -> None:
    op.drop_table("quotation_lines")
    op.drop_table("quotations")
