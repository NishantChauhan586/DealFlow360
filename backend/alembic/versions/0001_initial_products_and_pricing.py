"""Initial products, variants, price lists and seed data

Revision ID: 0001_initial_products_and_pricing
Revises: 
Create Date: 2026-09-05 10:30:00.000000+00:00

"""
from datetime import datetime, timezone
import json
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_initial_products_and_pricing"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --------------------------------------------------------------------------
    # 1. Create Tables
    # --------------------------------------------------------------------------
    products_table = op.create_table(
        "products",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("unit", sa.String(50), server_default="unit", nullable=False),
        sa.Column("tax_rate", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_products_id", "products", ["id"])
    op.create_index("ix_products_name", "products", ["name"])
    op.create_index("ix_products_category", "products", ["category"])
    op.create_index("ix_products_is_active", "products", ["is_active"])

    variants_table = op.create_table(
        "product_variants",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "product_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("products.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "attributes",
            postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"),
            nullable=False,
        ),
        sa.Column("extra_price", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_product_variants_id", "product_variants", ["id"])
    op.create_index("ix_product_variants_product_id", "product_variants", ["product_id"])

    price_lists_table = op.create_table(
        "price_lists",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("currency", sa.String(10), server_default="USD", nullable=False),
        sa.Column("customer_tier", sa.String(50), nullable=True),
        sa.Column(
            "product_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("products.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("base_price", sa.Float(), nullable=False),
        sa.Column("effective_from", sa.DateTime(timezone=True), nullable=False),
        sa.Column("effective_to", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "effective_to IS NULL OR effective_from < effective_to",
            name="check_effective_date_range",
        ),
    )
    op.create_index("ix_price_lists_id", "price_lists", ["id"])
    op.create_index("ix_price_lists_customer_tier", "price_lists", ["customer_tier"])
    op.create_index("ix_price_lists_product_id", "price_lists", ["product_id"])
    op.create_index("ix_price_lists_effective_from", "price_lists", ["effective_from"])
    op.create_index("ix_price_lists_effective_to", "price_lists", ["effective_to"])
    op.create_index(
        "ix_price_lists_lookup",
        "price_lists",
        ["product_id", "customer_tier", "effective_from", "effective_to"],
    )

    # --------------------------------------------------------------------------
    # 2. Seed Data: 5 Sample Products, Variants, and 2 Price Lists (Silver, Gold) + Default
    # --------------------------------------------------------------------------
    now = datetime.now(timezone.utc)
    effective_start = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)

    # Product UUIDs
    p1_id = uuid.uuid4()  # Hardware 1
    p2_id = uuid.uuid4()  # Hardware 2
    p3_id = uuid.uuid4()  # Service 1
    p4_id = uuid.uuid4()  # Service 2
    p5_id = uuid.uuid4()  # Subscription 1

    op.bulk_insert(
        products_table,
        [
            {
                "id": p1_id,
                "name": "Edge Gateway 5000",
                "category": "hardware",
                "description": "Industrial IoT edge gateway for high-throughput telemetry ingestion and real-time processing.",
                "unit": "unit",
                "tax_rate": 0.18,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": p2_id,
                "name": "Enterprise Server Node X1",
                "category": "hardware",
                "description": "High-performance rackmount server optimized for on-premise AI inference and model orchestration.",
                "unit": "unit",
                "tax_rate": 0.18,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": p3_id,
                "name": "Architecture Consulting & Setup",
                "category": "service",
                "description": "Onsite or remote advisory and architecture hardening by Principal Solutions Architects.",
                "unit": "hour",
                "tax_rate": 0.18,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": p4_id,
                "name": "Annual Enterprise SLA Support",
                "category": "service",
                "description": "24/7 dedicated enterprise response SLA with 15-minute incident turnaround.",
                "unit": "month",
                "tax_rate": 0.18,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": p5_id,
                "name": "DealFlow360 Enterprise Platform",
                "category": "subscription",
                "description": "All-in-one governance, quoting, risk and fulfillment SaaS platform license.",
                "unit": "user",
                "tax_rate": 0.18,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
        ],
    )

    # Product Variants
    op.bulk_insert(
        variants_table,
        [
            {
                "id": uuid.uuid4(),
                "product_id": p1_id,
                "attributes": {"RAM": "32GB", "Storage": "1TB NVMe"},
                "extra_price": 250.0,
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": uuid.uuid4(),
                "product_id": p1_id,
                "attributes": {"RAM": "64GB", "Storage": "2TB NVMe"},
                "extra_price": 600.0,
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": uuid.uuid4(),
                "product_id": p2_id,
                "attributes": {"Acceleration": "Dual NVIDIA L40S GPU"},
                "extra_price": 8500.0,
                "created_at": now,
                "updated_at": now,
            },
        ],
    )

    # Price Lists: Default, Silver (10% off), Gold (20% off)
    price_list_entries = [
        # --- Standard Default Tier (Tier: None) ---
        {
            "id": uuid.uuid4(),
            "name": "Standard Catalog Base - Edge Gateway 5000",
            "currency": "USD",
            "customer_tier": None,
            "product_id": p1_id,
            "base_price": 2499.0,
            "effective_from": effective_start,
            "effective_to": None,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": uuid.uuid4(),
            "name": "Standard Catalog Base - Enterprise Server Node X1",
            "currency": "USD",
            "customer_tier": None,
            "product_id": p2_id,
            "base_price": 14999.0,
            "effective_from": effective_start,
            "effective_to": None,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": uuid.uuid4(),
            "name": "Standard Catalog Base - Architecture Consulting",
            "currency": "USD",
            "customer_tier": None,
            "product_id": p3_id,
            "base_price": 250.0,
            "effective_from": effective_start,
            "effective_to": None,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": uuid.uuid4(),
            "name": "Standard Catalog Base - Enterprise SLA Support",
            "currency": "USD",
            "customer_tier": None,
            "product_id": p4_id,
            "base_price": 1200.0,
            "effective_from": effective_start,
            "effective_to": None,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": uuid.uuid4(),
            "name": "Standard Catalog Base - DealFlow360 Enterprise SaaS",
            "currency": "USD",
            "customer_tier": None,
            "product_id": p5_id,
            "base_price": 89.0,
            "effective_from": effective_start,
            "effective_to": None,
            "created_at": now,
            "updated_at": now,
        },
        # --- Silver Tier Schedule (Tier: silver) ---
        {
            "id": uuid.uuid4(),
            "name": "Silver Tier - Edge Gateway 5000",
            "currency": "USD",
            "customer_tier": "silver",
            "product_id": p1_id,
            "base_price": 2249.0,
            "effective_from": effective_start,
            "effective_to": None,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": uuid.uuid4(),
            "name": "Silver Tier - Enterprise Server Node X1",
            "currency": "USD",
            "customer_tier": "silver",
            "product_id": p2_id,
            "base_price": 13499.0,
            "effective_from": effective_start,
            "effective_to": None,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": uuid.uuid4(),
            "name": "Silver Tier - Architecture Consulting",
            "currency": "USD",
            "customer_tier": "silver",
            "product_id": p3_id,
            "base_price": 225.0,
            "effective_from": effective_start,
            "effective_to": None,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": uuid.uuid4(),
            "name": "Silver Tier - Enterprise SLA Support",
            "currency": "USD",
            "customer_tier": "silver",
            "product_id": p4_id,
            "base_price": 1080.0,
            "effective_from": effective_start,
            "effective_to": None,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": uuid.uuid4(),
            "name": "Silver Tier - DealFlow360 Enterprise SaaS",
            "currency": "USD",
            "customer_tier": "silver",
            "product_id": p5_id,
            "base_price": 79.0,
            "effective_from": effective_start,
            "effective_to": None,
            "created_at": now,
            "updated_at": now,
        },
        # --- Gold Tier Schedule (Tier: gold) ---
        {
            "id": uuid.uuid4(),
            "name": "Gold Tier - Edge Gateway 5000",
            "currency": "USD",
            "customer_tier": "gold",
            "product_id": p1_id,
            "base_price": 1999.0,
            "effective_from": effective_start,
            "effective_to": None,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": uuid.uuid4(),
            "name": "Gold Tier - Enterprise Server Node X1",
            "currency": "USD",
            "customer_tier": "gold",
            "product_id": p2_id,
            "base_price": 11999.0,
            "effective_from": effective_start,
            "effective_to": None,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": uuid.uuid4(),
            "name": "Gold Tier - Architecture Consulting",
            "currency": "USD",
            "customer_tier": "gold",
            "product_id": p3_id,
            "base_price": 200.0,
            "effective_from": effective_start,
            "effective_to": None,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": uuid.uuid4(),
            "name": "Gold Tier - Enterprise SLA Support",
            "currency": "USD",
            "customer_tier": "gold",
            "product_id": p4_id,
            "base_price": 960.0,
            "effective_from": effective_start,
            "effective_to": None,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": uuid.uuid4(),
            "name": "Gold Tier - DealFlow360 Enterprise SaaS",
            "currency": "USD",
            "customer_tier": "gold",
            "product_id": p5_id,
            "base_price": 69.0,
            "effective_from": effective_start,
            "effective_to": None,
            "created_at": now,
            "updated_at": now,
        },
    ]

    op.bulk_insert(price_lists_table, price_list_entries)


def downgrade() -> None:
    op.drop_table("price_lists")
    op.drop_table("product_variants")
    op.drop_table("products")
