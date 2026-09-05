from typing import List, Optional, Tuple
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.order import Order, OrderLine, OrderStatus


class OrderRepository:
    """
    Data access repository for Order and OrderLine entities.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, order_id: uuid.UUID) -> Optional[Order]:
        """
        Fetch order with eagerly loaded lines, products, and quotation.
        """
        stmt = (
            select(Order)
            .where(Order.id == order_id)
            .options(
                selectinload(Order.lines).selectinload(OrderLine.product),
                selectinload(Order.lines).selectinload(OrderLine.variant),
                selectinload(Order.quotation),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_order_number(self, order_number: str) -> Optional[Order]:
        stmt = (
            select(Order)
            .where(Order.order_number == order_number)
            .options(
                selectinload(Order.lines).selectinload(OrderLine.product),
                selectinload(Order.quotation),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_orders(
        self,
        skip: int = 0,
        limit: int = 20,
        customer_id: Optional[uuid.UUID] = None,
        status: Optional[OrderStatus] = None,
    ) -> Tuple[List[Order], int]:
        base_query = select(Order)
        count_query = select(func.count()).select_from(Order)

        if customer_id is not None:
            base_query = base_query.where(Order.customer_id == customer_id)
            count_query = count_query.where(Order.customer_id == customer_id)

        if status is not None:
            base_query = base_query.where(Order.status == status)
            count_query = count_query.where(Order.status == status)

        total_res = await self.session.execute(count_query)
        total = total_res.scalar_one()

        stmt = (
            base_query.options(
                selectinload(Order.lines).selectinload(OrderLine.product),
                selectinload(Order.quotation),
            )
            .order_by(Order.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all()), total

    async def create_order(self, order: Order) -> Order:
        self.session.add(order)
        await self.session.flush()
        await self.session.refresh(order)
        return order

    async def update_status(self, order: Order, new_status: OrderStatus) -> Order:
        order.status = new_status
        self.session.add(order)
        await self.session.flush()
        await self.session.refresh(order)
        return order
