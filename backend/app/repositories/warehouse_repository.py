from typing import List, Optional, Tuple
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.warehouse import Warehouse
from app.schemas.warehouse import WarehouseCreate, WarehouseUpdate


class WarehouseRepository:
    """
    Data access repository for Warehouse logistics facilities.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, warehouse_id: uuid.UUID) -> Optional[Warehouse]:
        """
        Fetch a warehouse by primary key.
        """
        stmt = (
            select(Warehouse)
            .where(Warehouse.id == warehouse_id)
            .options(selectinload(Warehouse.inventory_items))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_warehouses(
        self,
        skip: int = 0,
        limit: int = 50,
        is_active: Optional[bool] = None,
    ) -> Tuple[List[Warehouse], int]:
        """
        Retrieve paginated warehouses sorted by lowest shipping cost weight first.
        """
        base_query = select(Warehouse)
        count_query = select(func.count()).select_from(Warehouse)

        if is_active is not None:
            base_query = base_query.where(Warehouse.is_active == is_active)
            count_query = count_query.where(Warehouse.is_active == is_active)

        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        stmt = (
            base_query.options(selectinload(Warehouse.inventory_items))
            .order_by(Warehouse.shipping_cost_weight.asc(), Warehouse.name.asc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        items = list(result.scalars().all())

        return items, total

    async def get_active_warehouses_cheapest_first(self) -> List[Warehouse]:
        """
        List all active fulfillment warehouses ordered by shipping_cost_weight ascending.
        """
        stmt = (
            select(Warehouse)
            .where(Warehouse.is_active.is_(True))
            .order_by(Warehouse.shipping_cost_weight.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, warehouse_in: WarehouseCreate) -> Warehouse:
        """
        Persist a new warehouse facility.
        """
        db_warehouse = Warehouse(
            name=warehouse_in.name,
            address=warehouse_in.address,
            shipping_cost_weight=warehouse_in.shipping_cost_weight,
            is_active=warehouse_in.is_active,
        )
        self.session.add(db_warehouse)
        await self.session.flush()
        await self.session.refresh(db_warehouse)
        return db_warehouse

    async def update(
        self, db_warehouse: Warehouse, warehouse_in: WarehouseUpdate
    ) -> Warehouse:
        """
        Update warehouse details or logistics weight.
        """
        update_data = warehouse_in.model_dump(exclude_unset=True)
        for field, val in update_data.items():
            setattr(db_warehouse, field, val)

        self.session.add(db_warehouse)
        await self.session.flush()
        await self.session.refresh(db_warehouse)
        return db_warehouse
