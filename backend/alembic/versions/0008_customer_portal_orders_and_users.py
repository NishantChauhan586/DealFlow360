"""Create users, orders, and order_lines tables with seed user accounts

Revision ID: 0008_customer_portal_orders_and_users
Revises: 0007_upsell_product_pairings
Create Date: 2026-09-05 14:30:00.000000+00:00

"""
from datetime import datetime, timezone
from typing import Sequence, Union
import uuid

from alembic import op
from passlib.context import CryptContext
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0008_customer_portal_orders_and_users"
down_revision: Union[str, None] = "0007_upsell_product_pairings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def upgrade() -> None:
    # --------------------------------------------------------------------------
    # 1. Create Users Table
    # --------------------------------------------------------------------------
    users_table = op.create_table(
        "users",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), server_default="User", nullable=False),
        sa.Column("role", sa.String(50), server_default="sales_rep", nullable=False),
        sa.Column("customer_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_role", "users", ["role"])
    op.create_index("ix_users_customer_id", "users", ["customer_id"])
    op.create_index("ix_users_role_customer", "users", ["role", "customer_id"])

    # --------------------------------------------------------------------------
    # 2. Create Orders Table
    # --------------------------------------------------------------------------
    orders_table = op.create_table(
        "orders",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("order_number", sa.String(50), unique=True, nullable=False),
        sa.Column(
            "quotation_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("quotations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("customer_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("sales_rep_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("status", sa.String(50), server_default="pending", nullable=False),
        sa.Column("total_amount", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("currency", sa.String(10), server_default="USD", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_orders_id", "orders", ["id"])
    op.create_index("ix_orders_order_number", "orders", ["order_number"])
    op.create_index("ix_orders_quotation_id", "orders", ["quotation_id"])
    op.create_index("ix_orders_customer_id", "orders", ["customer_id"])
    op.create_index("ix_orders_customer_status", "orders", ["customer_id", "status"])

    # --------------------------------------------------------------------------
    # 3. Create Order Lines Table
    # --------------------------------------------------------------------------
    order_lines_table = op.create_table(
        "order_lines",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "order_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("orders.id", ondelete="CASCADE"),
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
        sa.Column("quantity", sa.Integer(), server_default="1", nullable=False),
        sa.Column("unit_price", sa.Float(), nullable=False),
        sa.Column("discount_percent", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("line_total", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("margin_percent", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_order_lines_id", "order_lines", ["id"])
    op.create_index("ix_order_lines_order_id", "order_lines", ["order_id"])
    op.create_index("ix_order_lines_product_id", "order_lines", ["product_id"])

    # --------------------------------------------------------------------------
    # 4. Seed Standard User Roles (Customer, Rep, Manager, Finance, Admin)
    # --------------------------------------------------------------------------
    now = datetime.now(timezone.utc)
    hashed_pwd = pwd_ctx.hash("password123")
    sample_customer_uuid = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")

    seed_users = [
        {
            "id": uuid.uuid4(),
            "email": "customer@acmecorp.com",
            "hashed_password": hashed_pwd,
            "full_name": "Acme Corp Procurement",
            "role": "customer",
            "customer_id": sample_customer_uuid,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
            "email": "rep@dealflow360.com",
            "hashed_password": hashed_pwd,
            "full_name": "Alex Mercer (Enterprise AE)",
            "role": "sales_rep",
            "customer_id": None,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": uuid.uuid4(),
            "email": "manager@dealflow360.com",
            "hashed_password": hashed_pwd,
            "full_name": "Sarah Chen (VP Sales)",
            "role": "sales_manager",
            "customer_id": None,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": uuid.uuid4(),
            "email": "finance@dealflow360.com",
            "hashed_password": hashed_pwd,
            "full_name": "David Miller (Director of Finance)",
            "role": "finance",
            "customer_id": None,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": uuid.uuid4(),
            "email": "admin@dealflow360.com",
            "hashed_password": hashed_pwd,
            "full_name": "System Administrator",
            "role": "admin",
            "customer_id": None,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        },
    ]

    op.bulk_insert(users_table, seed_users)


def downgrade() -> None:
    op.drop_table("order_lines")
    op.drop_table("orders")
    op.drop_table("users")
