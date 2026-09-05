"""Create warehouses, inventory, and fulfillment splits tables with seed data

Revision ID: 0005_warehouses_and_fulfillment
Revises: 0004_approval_requests
Create Date: 2026-09-05 13:00:00.000000+00:00

"""
from datetime import datetime, timezone
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0005_warehouses_and_fulfillment"
down_revision: Union[str, None] = "0004_approval_requests"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --------------------------------------------------------------------------
    # 1. Create Tables
    # --------------------------------------------------------------------------
    warehouses_table = op.create_table(
        "warehouses",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("address", sa.String(500), nullable=False),
        sa.Column("shipping_cost_weight", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_warehouses_id", "warehouses", ["id"])
    op.create_index("ix_warehouses_name", "warehouses", ["name"])
    op.create_index("ix_warehouses_is_active", "warehouses", ["is_active"])

    inventory_table = op.create_table(
        "inventory",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "warehouse_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("warehouses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "product_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("products.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("quantity_on_hand", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reserved_quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reorder_point", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("warehouse_id", "product_id", name="uq_warehouse_product_inventory"),
    )
    op.create_index("ix_inventory_id", "inventory", ["id"])
    op.create_index("ix_inventory_warehouse_id", "inventory", ["warehouse_id"])
    op.create_index("ix_inventory_product_id", "inventory", ["product_id"])
    op.create_index("ix_inventory_lookup", "inventory", ["product_id", "warehouse_id"])

    fulfillment_splits_table = op.create_table(
        "fulfillment_splits",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("order_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column(
            "product_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("products.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "warehouse_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("warehouses.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("allocated_quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("shipping_cost", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_fulfillment_splits_id", "fulfillment_splits", ["id"])
    op.create_index("ix_fulfillment_splits_order_id", "fulfillment_splits", ["order_id"])
    op.create_index(
        "ix_fulfillment_splits_order", "fulfillment_splits", ["order_id", "status"]
    )

    # --------------------------------------------------------------------------
    # 2. Seed Data: 2 Warehouses (Main, East) & Stock for Hardware Products
    # --------------------------------------------------------------------------
    now = datetime.now(timezone.utc)
    wh_main_id = uuid.uuid4()
    wh_east_id = uuid.uuid4()

    op.bulk_insert(
        warehouses_table,
        [
            {
                "id": wh_main_id,
                "name": "Main Central Distribution Hub",
                "address": "100 Logistics Blvd, Dallas, TX 75201",
                "shipping_cost_weight": 1.0,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": wh_east_id,
                "name": "East Coast Express Fulfillment",
                "address": "450 Industrial Parkway, Newark, NJ 07102",
                "shipping_cost_weight": 1.6,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
        ],
    )

    # Query existing hardware products to populate inventory
    bind = op.get_bind()
    conn = bind.connect() if hasattr(bind, "connect") else bind
    hw_products = conn.execute(
        sa.text("SELECT id, name FROM products WHERE category = 'hardware'")
    ).fetchall()

    inventory_records = []
    for row in hw_products:
        prod_id = row[0]
        prod_name = row[1]

        if "Gateway" in prod_name:
            # Main: on_hand=50, reserved=5 | East: on_hand=20, reserved=2
            inventory_records.append({
                "id": uuid.uuid4(),
                "warehouse_id": wh_main_id,
                "product_id": prod_id,
                "quantity_on_hand": 50,
                "reserved_quantity": 5,
                "reorder_point": 10,
                "created_at": now,
                "updated_at": now,
            })
            inventory_records.append({
                "id": uuid.uuid4(),
                "warehouse_id": wh_east_id,
                "product_id": prod_id,
                "quantity_on_hand": 20,
                "reserved_quantity": 2,
                "reorder_point": 5,
                "created_at": now,
                "updated_at": now,
            })
        elif "Server" in prod_name:
            # Main: on_hand=15, reserved=3 | East: on_hand=8, reserved=0
            inventory_records.append({
                "id": uuid.uuid4(),
                "warehouse_id": wh_main_id,
                "product_id": prod_id,
                "quantity_on_hand": 15,
                "reserved_quantity": 3,
                "reorder_point": 5,
                "created_at": now,
                "updated_at": now,
            })
            inventory_records.append({
                "id": uuid.uuid4(),
                "warehouse_id": wh_east_id,
                "product_id": prod_id,
                "quantity_on_hand": 8,
                "reserved_quantity": 0,
                "reorder_point": 2,
                "created_at": now,
                "updated_at": now,
            })

    if inventory_records:
        op.bulk_insert(inventory_table, inventory_records)


def downgrade() -> None:
    op.drop_table("fulfillment_splits")
    op.drop_table("inventory")
    op.drop_table("warehouses")
