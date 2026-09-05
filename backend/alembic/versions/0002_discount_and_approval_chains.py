"""Discount tiers and approval chains governance models with seed data

Revision ID: 0002_discount_and_approval_chains
Revises: 0001_initial_products_and_pricing
Create Date: 2026-09-05 11:15:00.000000+00:00

"""
from datetime import datetime, timezone
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0002_discount_and_approval_chains"
down_revision: Union[str, None] = "0001_initial_products_and_pricing"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --------------------------------------------------------------------------
    # 1. Create Tables
    # --------------------------------------------------------------------------
    discount_tiers_table = op.create_table(
        "discount_tiers",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("customer_tier", sa.String(50), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("max_discount_percent", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("customer_tier", "category", name="uq_discount_tier_category"),
    )
    op.create_index("ix_discount_tiers_id", "discount_tiers", ["id"])
    op.create_index("ix_discount_tiers_customer_tier", "discount_tiers", ["customer_tier"])
    op.create_index("ix_discount_tiers_category", "discount_tiers", ["category"])
    op.create_index("ix_discount_tier_lookup", "discount_tiers", ["customer_tier", "category"])

    approval_chains_table = op.create_table(
        "approval_chains",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column(
            "trigger_condition",
            postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"),
            nullable=False,
        ),
        sa.Column(
            "sequence",
            postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"),
            nullable=False,
        ),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_approval_chains_id", "approval_chains", ["id"])
    op.create_index("ix_approval_chains_is_active", "approval_chains", ["is_active"])

    # --------------------------------------------------------------------------
    # 2. Seed Data
    # --------------------------------------------------------------------------
    now = datetime.now(timezone.utc)

    # Seed Discount Tiers: Bronze, Silver, Gold across categories
    op.bulk_insert(
        discount_tiers_table,
        [
            # --- Bronze Tier (Hardware: 5%, Service: 3%, Subscription: 4%) ---
            {
                "id": uuid.uuid4(),
                "name": "Bronze Tier - Hardware Ceiling",
                "customer_tier": "bronze",
                "category": "hardware",
                "max_discount_percent": 5.0,
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": uuid.uuid4(),
                "name": "Bronze Tier - Service Ceiling",
                "customer_tier": "bronze",
                "category": "service",
                "max_discount_percent": 3.0,
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": uuid.uuid4(),
                "name": "Bronze Tier - Subscription Ceiling",
                "customer_tier": "bronze",
                "category": "subscription",
                "max_discount_percent": 4.0,
                "created_at": now,
                "updated_at": now,
            },
            # --- Silver Tier (Hardware: 10%, Service: 7%, Subscription: 8%) ---
            {
                "id": uuid.uuid4(),
                "name": "Silver Tier - Hardware Ceiling",
                "customer_tier": "silver",
                "category": "hardware",
                "max_discount_percent": 10.0,
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": uuid.uuid4(),
                "name": "Silver Tier - Service Ceiling",
                "customer_tier": "silver",
                "category": "service",
                "max_discount_percent": 7.0,
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": uuid.uuid4(),
                "name": "Silver Tier - Subscription Ceiling",
                "customer_tier": "silver",
                "category": "subscription",
                "max_discount_percent": 8.0,
                "created_at": now,
                "updated_at": now,
            },
            # --- Gold Tier (Hardware: 15%, Service: 10%, Subscription: 12%) ---
            {
                "id": uuid.uuid4(),
                "name": "Gold Tier - Hardware Ceiling",
                "customer_tier": "gold",
                "category": "hardware",
                "max_discount_percent": 15.0,
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": uuid.uuid4(),
                "name": "Gold Tier - Service Ceiling",
                "customer_tier": "gold",
                "category": "service",
                "max_discount_percent": 10.0,
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": uuid.uuid4(),
                "name": "Gold Tier - Subscription Ceiling",
                "customer_tier": "gold",
                "category": "subscription",
                "max_discount_percent": 12.0,
                "created_at": now,
                "updated_at": now,
            },
        ],
    )

    # Seed Approval Chains:
    # Chain 1: Medium risk -> ["sales_manager"]
    # Chain 2: High risk -> ["sales_manager", "finance"]
    op.bulk_insert(
        approval_chains_table,
        [
            {
                "id": uuid.uuid4(),
                "name": "Medium Risk Approval Policy",
                "trigger_condition": {"min_risk": 3.0, "max_risk": 6.9},
                "sequence": ["sales_manager"],
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": uuid.uuid4(),
                "name": "High Risk Executive Approval Policy",
                "trigger_condition": {"min_risk": 7.0, "max_risk": 10.0},
                "sequence": ["sales_manager", "finance"],
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
        ],
    )


def downgrade() -> None:
    op.drop_table("approval_chains")
    op.drop_table("discount_tiers")
