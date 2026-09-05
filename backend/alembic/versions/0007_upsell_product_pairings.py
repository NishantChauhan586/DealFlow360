"""Create product_pairings table and seed upsell and cross-sell relationships

Revision ID: 0007_upsell_product_pairings
Revises: 0006_subscriptions_and_billing
Create Date: 2026-09-05 14:00:00.000000+00:00

"""
from datetime import datetime, timezone
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0007_upsell_product_pairings"
down_revision: Union[str, None] = "0006_subscriptions_and_billing"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --------------------------------------------------------------------------
    # 1. Create product_pairings table
    # --------------------------------------------------------------------------
    product_pairings_table = op.create_table(
        "product_pairings",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "source_product_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("products.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "target_product_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("products.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("co_purchase_score", sa.Float(), server_default="0.5", nullable=False),
        sa.Column("is_promoted", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("min_margin_threshold", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "source_product_id",
            "target_product_id",
            name="uq_product_pairings_source_target",
        ),
    )
    op.create_index("ix_product_pairings_id", "product_pairings", ["id"])
    op.create_index("ix_product_pairings_source_product_id", "product_pairings", ["source_product_id"])
    op.create_index("ix_product_pairings_target_product_id", "product_pairings", ["target_product_id"])
    op.create_index("ix_product_pairings_is_promoted", "product_pairings", ["is_promoted"])
    op.create_index(
        "ix_product_pairings_source_promoted",
        "product_pairings",
        ["source_product_id", "is_promoted", "co_purchase_score"],
    )

    # --------------------------------------------------------------------------
    # 2. Seed Initial High-Affinity Product Pairings
    # --------------------------------------------------------------------------
    bind = op.get_bind()
    now = datetime.now(timezone.utc)

    # Fetch existing product IDs by name
    products_res = bind.execute(sa.text("SELECT id, name FROM products")).fetchall()
    prod_map = {row[1]: row[0] for row in products_res}

    # Ensure target products exist
    gateway_id = prod_map.get("Edge Gateway 5000")
    server_id = prod_map.get("Enterprise Server Node X1")
    consulting_id = prod_map.get("Architecture Consulting & Setup")
    support_id = prod_map.get("Annual Enterprise SLA Support")
    saas_id = prod_map.get("DealFlow360 Enterprise Platform")

    seed_pairings = []

    # 1. Edge Gateway -> Consulting (Promoted, 88% affinity, 20% min margin)
    if gateway_id and consulting_id:
        seed_pairings.append({
            "id": uuid.uuid4(),
            "source_product_id": gateway_id,
            "target_product_id": consulting_id,
            "co_purchase_score": 0.88,
            "is_promoted": True,
            "min_margin_threshold": 20.0,
            "created_at": now,
            "updated_at": now,
        })

    # 2. Edge Gateway -> SLA Support (75% affinity, 15% min margin)
    if gateway_id and support_id:
        seed_pairings.append({
            "id": uuid.uuid4(),
            "source_product_id": gateway_id,
            "target_product_id": support_id,
            "co_purchase_score": 0.75,
            "is_promoted": False,
            "min_margin_threshold": 15.0,
            "created_at": now,
            "updated_at": now,
        })

    # 3. Enterprise Server Node -> Consulting (Promoted, 92% affinity, 20% min margin)
    if server_id and consulting_id:
        seed_pairings.append({
            "id": uuid.uuid4(),
            "source_product_id": server_id,
            "target_product_id": consulting_id,
            "co_purchase_score": 0.92,
            "is_promoted": True,
            "min_margin_threshold": 20.0,
            "created_at": now,
            "updated_at": now,
        })

    # 4. Enterprise Server Node -> SLA Support (85% affinity, 15% min margin)
    if server_id and support_id:
        seed_pairings.append({
            "id": uuid.uuid4(),
            "source_product_id": server_id,
            "target_product_id": support_id,
            "co_purchase_score": 0.85,
            "is_promoted": False,
            "min_margin_threshold": 15.0,
            "created_at": now,
            "updated_at": now,
        })

    # 5. DealFlow360 SaaS Platform -> SLA Support (Promoted, 80% affinity, 15% min margin)
    if saas_id and support_id:
        seed_pairings.append({
            "id": uuid.uuid4(),
            "source_product_id": saas_id,
            "target_product_id": support_id,
            "co_purchase_score": 0.80,
            "is_promoted": True,
            "min_margin_threshold": 15.0,
            "created_at": now,
            "updated_at": now,
        })

    if seed_pairings:
        op.bulk_insert(product_pairings_table, seed_pairings)


def downgrade() -> None:
    op.drop_table("product_pairings")
