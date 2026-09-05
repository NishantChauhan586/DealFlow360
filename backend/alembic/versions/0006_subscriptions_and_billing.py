"""Create subscription plans, subscriptions, invoices, billing schedules, and credit notes tables with seed data

Revision ID: 0006_subscriptions_and_billing
Revises: 0005_warehouses_and_fulfillment
Create Date: 2026-09-05 13:30:00.000000+00:00

"""
from datetime import datetime, timezone
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0006_subscriptions_and_billing"
down_revision: Union[str, None] = "0005_warehouses_and_fulfillment"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --------------------------------------------------------------------------
    # 1. Create Tables
    # --------------------------------------------------------------------------
    subscription_plans_table = op.create_table(
        "subscription_plans",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "product_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("products.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("interval", sa.String(50), nullable=False, server_default="monthly"),
        sa.Column("interval_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("trial_period_days", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "cancellation_policy",
            postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_subscription_plans_id", "subscription_plans", ["id"])
    op.create_index("ix_subscription_plans_product_id", "subscription_plans", ["product_id"])

    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("order_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("customer_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column(
            "product_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("products.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "plan_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("subscription_plans.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("unit_price", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("prorated_amount", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_subscriptions_id", "subscriptions", ["id"])
    op.create_index("ix_subscriptions_order", "subscriptions", ["order_id"])
    op.create_index("ix_subscriptions_customer_id", "subscriptions", ["customer_id"])
    op.create_index("ix_subscriptions_cust_status", "subscriptions", ["customer_id", "status"])

    op.create_table(
        "invoices",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("order_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("invoice_number", sa.String(100), unique=True, nullable=False),
        sa.Column("amount", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("status", sa.String(50), nullable=False, server_default="open"),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("invoice_type", sa.String(50), nullable=False, server_default="one_time"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_invoices_id", "invoices", ["id"])
    op.create_index("ix_invoices_order_id", "invoices", ["order_id"])
    op.create_index("ix_invoices_number", "invoices", ["invoice_number"])
    op.create_index("ix_invoices_status", "invoices", ["status"])

    op.create_table(
        "billing_schedules",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "subscription_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("subscriptions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("invoice_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("amount_due", sa.Float(), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column(
            "invoice_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("invoices.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_billing_schedules_id", "billing_schedules", ["id"])
    op.create_index("ix_billing_schedules_subscription_id", "billing_schedules", ["subscription_id"])
    op.create_index("ix_billing_schedules_invoice_date", "billing_schedules", ["invoice_date"])

    op.create_table(
        "credit_notes",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "subscription_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("subscriptions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "invoice_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("invoices.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("credit_note_number", sa.String(100), unique=True, nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("reason", sa.String(500), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="issued"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_credit_notes_id", "credit_notes", ["id"])
    op.create_index("ix_credit_notes_number", "credit_notes", ["credit_note_number"])

    # --------------------------------------------------------------------------
    # 2. Seed Data: Default Subscription Plans for SaaS Products
    # --------------------------------------------------------------------------
    now = datetime.now(timezone.utc)
    bind = op.get_bind()
    conn = bind.connect() if hasattr(bind, "connect") else bind
    sub_products = conn.execute(
        sa.text("SELECT id, name FROM products WHERE category = 'subscription'")
    ).fetchall()

    plans_to_insert = []
    for row in sub_products:
        p_id = row[0]
        # Monthly Plan
        plans_to_insert.append({
            "id": uuid.uuid4(),
            "product_id": p_id,
            "interval": "monthly",
            "interval_count": 1,
            "trial_period_days": 14,
            "cancellation_policy": {"allow_mid_cycle_refund": True, "notice_period_days": 0},
            "created_at": now,
            "updated_at": now,
        })
        # Yearly Plan
        plans_to_insert.append({
            "id": uuid.uuid4(),
            "product_id": p_id,
            "interval": "yearly",
            "interval_count": 1,
            "trial_period_days": 30,
            "cancellation_policy": {"allow_mid_cycle_refund": True, "notice_period_days": 30},
            "created_at": now,
            "updated_at": now,
        })

    if plans_to_insert:
        op.bulk_insert(subscription_plans_table, plans_to_insert)


def downgrade() -> None:
    op.drop_table("credit_notes")
    op.drop_table("billing_schedules")
    op.drop_table("invoices")
    op.drop_table("subscriptions")
    op.drop_table("subscription_plans")
