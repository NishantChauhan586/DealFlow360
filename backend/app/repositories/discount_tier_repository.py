from typing import List, Optional, Tuple
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.discount_tier import DiscountTier
from app.models.product import ProductCategory
from app.schemas.discount_tier import DiscountTierCreate, DiscountTierUpdate


class DiscountTierRepository:
    """
    Data access repository for DiscountTier rules.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, tier_id: uuid.UUID) -> Optional[DiscountTier]:
        """
        Fetch a single discount tier by primary key.
        """
        stmt = select(DiscountTier).where(DiscountTier.id == tier_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_tier_and_category(
        self, customer_tier: str, category: ProductCategory
    ) -> Optional[DiscountTier]:
        """
        Fetch matching discount tier for customer tier and product category.
        """
        stmt = select(DiscountTier).where(
            func.lower(DiscountTier.customer_tier) == customer_tier.lower(),
            DiscountTier.category == category,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_discount_tiers(
        self,
        skip: int = 0,
        limit: int = 50,
        customer_tier: Optional[str] = None,
        category: Optional[ProductCategory] = None,
    ) -> Tuple[List[DiscountTier], int]:
        """
        List paginated discount tier configuration records.
        """
        base_query = select(DiscountTier)
        count_query = select(func.count()).select_from(DiscountTier)

        if customer_tier is not None:
            base_query = base_query.where(
                func.lower(DiscountTier.customer_tier) == customer_tier.lower()
            )
            count_query = count_query.where(
                func.lower(DiscountTier.customer_tier) == customer_tier.lower()
            )

        if category is not None:
            base_query = base_query.where(DiscountTier.category == category)
            count_query = count_query.where(DiscountTier.category == category)

        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        stmt = (
            base_query.order_by(DiscountTier.customer_tier.asc(), DiscountTier.category.asc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        items = list(result.scalars().all())

        return items, total

    async def create(self, tier_in: DiscountTierCreate) -> DiscountTier:
        """
        Persist a new discount tier rule.
        """
        db_tier = DiscountTier(
            name=tier_in.name,
            customer_tier=tier_in.customer_tier.lower(),
            category=tier_in.category,
            max_discount_percent=tier_in.max_discount_percent,
        )
        self.session.add(db_tier)
        await self.session.flush()
        await self.session.refresh(db_tier)
        return db_tier

    async def update(
        self, db_tier: DiscountTier, tier_in: DiscountTierUpdate
    ) -> DiscountTier:
        """
        Update an existing discount tier rule.
        """
        update_data = tier_in.model_dump(exclude_unset=True)
        if "customer_tier" in update_data and update_data["customer_tier"]:
            update_data["customer_tier"] = update_data["customer_tier"].lower()

        for field, val in update_data.items():
            setattr(db_tier, field, val)

        self.session.add(db_tier)
        await self.session.flush()
        await self.session.refresh(db_tier)
        return db_tier

    async def delete(self, db_tier: DiscountTier) -> None:
        """
        Delete a discount tier rule.
        """
        await self.session.delete(db_tier)
        await self.session.flush()
