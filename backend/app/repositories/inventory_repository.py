from typing import List, Optional
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.warehouse import Inventory, Warehouse
from app.schemas.warehouse import InventoryUpdatePayload


class InventoryRepository:
    """
    Data access repository for warehouse stock and inventory levels.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, inventory_id: uuid.UUID) -> Optional[Inventory]:
        """
        Fetch inventory record by primary key.
        """
        stmt = (
            select(Inventory)
            .where(Inventory.id == inventory_id)
            .options(selectinload(Inventory.warehouse), selectinload(Inventory.product))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_warehouse_and_product(
        self, warehouse_id: uuid.UUID, product_id: uuid.UUID
    ) -> Optional[Inventory]:
        """
        Fetch specific product inventory record in a given warehouse.
        """
        stmt = (
            select(Inventory)
            .where(
                Inventory.warehouse_id == warehouse_id,
                Inventory.product_id == product_id,
            )
            .options(selectinload(Inventory.warehouse), selectinload(Inventory.product))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_warehouse(self, warehouse_id: uuid.UUID) -> List[Inventory]:
        """
        List all inventory SKU records in a warehouse.
        """
        stmt = (
            select(Inventory)
            .where(Inventory.warehouse_id == warehouse_id)
            .options(selectinload(Inventory.product))
            .order_by(Inventory.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_by_product_cheapest_warehouses_first(
        self, product_id: uuid.UUID
    ) -> List[Inventory]:
        """
        Retrieve all active warehouse inventories for a product, sorted by warehouse shipping_cost_weight ascending.
        """
        stmt = (
            select(Inventory)
            .join(Warehouse, Inventory.warehouse_id == Warehouse.id)
            .where(
                Inventory.product_id == product_id,
                Warehouse.is_active.is_(True),
            )
            .options(selectinload(Inventory.warehouse), selectinload(Inventory.product))
            .order_by(Warehouse.shipping_cost_weight.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def upsert_stock(
        self, warehouse_id: uuid.UUID, payload: InventoryUpdatePayload
    ) -> Inventory:
        """
        Create or update inventory on-hand and reserved levels.
        """
        existing = await self.get_by_warehouse_and_product(
            warehouse_id=warehouse_id, product_id=payload.product_id
        )

        if existing:
            existing.quantity_on_hand = payload.quantity_on_hand
            if payload.reserved_quantity is not None:
                existing.reserved_quantity = payload.reserved_quantity
            if payload.reorder_point is not None:
                existing.reorder_point = payload.reorder_point
            self.session.add(existing)
            await self.session.flush()
            await self.session.refresh(existing, ["warehouse", "product"])
            return existing

        new_inv = Inventory(
            warehouse_id=warehouse_id,
            product_id=payload.product_id,
            quantity_on_hand=payload.quantity_on_hand,
            reserved_quantity=payload.reserved_quantity or 0,
            reorder_point=payload.reorder_point or 10,
        )
        self.session.add(new_inv)
        await self.session.flush()
        await self.session.refresh(new_inv, ["warehouse", "product"])
        return new_inv
