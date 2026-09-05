from datetime import datetime
from typing import List, Optional, Tuple
import uuid
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.price_list import PriceList
from app.schemas.price_list import PriceListCreate, PriceListUpdate


class PriceListRepository:
    """
    Data access repository for PriceList entries with date window querying and resolution algorithms.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, price_list_id: uuid.UUID) -> Optional[PriceList]:
        """
        Fetch a single price list entry by primary key.
        """
        stmt = select(PriceList).where(PriceList.id == price_list_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_price_lists(
        self,
        skip: int = 0,
        limit: int = 50,
        product_id: Optional[uuid.UUID] = None,
        customer_tier: Optional[str] = None,
    ) -> Tuple[List[PriceList], int]:
        """
        Retrieve paginated price list records with optional filters.
        """
        base_query = select(PriceList)
        count_query = select(func.count()).select_from(PriceList)

        if product_id is not None:
            base_query = base_query.where(PriceList.product_id == product_id)
            count_query = count_query.where(PriceList.product_id == product_id)

        if customer_tier is not None:
            base_query = base_query.where(
                func.lower(PriceList.customer_tier) == customer_tier.lower()
            )
            count_query = count_query.where(
                func.lower(PriceList.customer_tier) == customer_tier.lower()
            )

        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        stmt = (
            base_query.order_by(PriceList.effective_from.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        items = list(result.scalars().all())

        return items, total

    async def create(self, price_list_in: PriceListCreate) -> PriceList:
        """
        Create and persist a new PriceList entry.
        """
        db_price_list = PriceList(
            name=price_list_in.name,
            currency=price_list_in.currency.upper(),
            customer_tier=price_list_in.customer_tier.lower()
            if price_list_in.customer_tier
            else None,
            product_id=price_list_in.product_id,
            base_price=price_list_in.base_price,
            effective_from=price_list_in.effective_from,
            effective_to=price_list_in.effective_to,
        )
        self.session.add(db_price_list)
        await self.session.flush()
        await self.session.refresh(db_price_list)
        return db_price_list

    async def update(
        self, db_price_list: PriceList, price_list_in: PriceListUpdate
    ) -> PriceList:
        """
        Update an existing PriceList entry.
        """
        update_data = price_list_in.model_dump(exclude_unset=True)
        if "currency" in update_data and update_data["currency"]:
            update_data["currency"] = update_data["currency"].upper()
        if "customer_tier" in update_data and update_data["customer_tier"]:
            update_data["customer_tier"] = update_data["customer_tier"].lower()

        for field, val in update_data.items():
            setattr(db_price_list, field, val)

        self.session.add(db_price_list)
        await self.session.flush()
        await self.session.refresh(db_price_list)
        return db_price_list

    async def delete(self, db_price_list: PriceList) -> None:
        """
        Delete a PriceList entry.
        """
        await self.session.delete(db_price_list)
        await self.session.flush()

    async def find_effective_prices(
        self,
        product_id: uuid.UUID,
        as_of: datetime,
    ) -> List[PriceList]:
        """
        Query all active price list entries for a product or global defaults effective at the given timestamp.
        """
        stmt = (
            select(PriceList)
            .where(
                or_(
                    PriceList.product_id == product_id,
                    PriceList.product_id.is_(None),
                )
            )
            .where(PriceList.effective_from <= as_of)
            .where(
                or_(
                    PriceList.effective_to.is_(None),
                    PriceList.effective_to >= as_of,
                )
            )
            .order_by(PriceList.effective_from.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
