from typing import List, Optional
import uuid
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.warehouse import FulfillmentSplit


class FulfillmentSplitRepository:
    """
    Data access repository for FulfillmentSplit records.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_by_order(self, order_id: uuid.UUID) -> List[FulfillmentSplit]:
        """
        List all fulfillment splits for an order with eager warehouse and product relations.
        """
        stmt = (
            select(FulfillmentSplit)
            .where(FulfillmentSplit.order_id == order_id)
            .options(
                selectinload(FulfillmentSplit.warehouse),
                selectinload(FulfillmentSplit.product),
            )
            .order_by(FulfillmentSplit.created_at.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create_many(
        self, splits: List[FulfillmentSplit]
    ) -> List[FulfillmentSplit]:
        """
        Bulk persist fulfillment splits.
        """
        for s in splits:
            self.session.add(s)
        await self.session.flush()
        for s in splits:
            await self.session.refresh(s, ["warehouse", "product"])
        return splits

    async def delete_by_order(self, order_id: uuid.UUID) -> None:
        """
        Delete all existing fulfillment splits for an order.
        """
        stmt = delete(FulfillmentSplit).where(
            FulfillmentSplit.order_id == order_id
        )
        await self.session.execute(stmt)
        await self.session.flush()
