from typing import List, Optional, Tuple
import uuid
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.product_pairing import ProductPairing
from app.schemas.upsell import ProductPairingCreate, ProductPairingUpdate


class ProductPairingRepository:
    """
    Data access repository for ProductPairing relationships.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, pairing_id: uuid.UUID) -> Optional[ProductPairing]:
        """
        Fetch a single pairing by ID with joined source and target products.
        """
        stmt = (
            select(ProductPairing)
            .where(ProductPairing.id == pairing_id)
            .options(
                selectinload(ProductPairing.source_product),
                selectinload(ProductPairing.target_product),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_source_and_target(
        self, source_id: uuid.UUID, target_id: uuid.UUID
    ) -> Optional[ProductPairing]:
        """
        Fetch pairing for a specific (source, target) pair.
        """
        stmt = select(ProductPairing).where(
            ProductPairing.source_product_id == source_id,
            ProductPairing.target_product_id == target_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_pairings_for_source_products(
        self, source_product_ids: List[uuid.UUID]
    ) -> List[ProductPairing]:
        """
        Fetch all product pairings for given source products, ordered by:
        1. is_promoted DESC (promoted items first)
        2. co_purchase_score DESC (highest affinity score first)
        """
        if not source_product_ids:
            return []

        stmt = (
            select(ProductPairing)
            .where(ProductPairing.source_product_id.in_(source_product_ids))
            .options(
                selectinload(ProductPairing.source_product),
                selectinload(ProductPairing.target_product),
            )
            .order_by(
                desc(ProductPairing.is_promoted),
                desc(ProductPairing.co_purchase_score),
            )
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_pairings(
        self,
        skip: int = 0,
        limit: int = 50,
        source_product_id: Optional[uuid.UUID] = None,
        is_promoted: Optional[bool] = None,
    ) -> Tuple[List[ProductPairing], int]:
        """
        Paginated listing of product pairings.
        """
        base_query = select(ProductPairing)
        count_query = select(func.count()).select_from(ProductPairing)

        if source_product_id is not None:
            base_query = base_query.where(ProductPairing.source_product_id == source_product_id)
            count_query = count_query.where(ProductPairing.source_product_id == source_product_id)

        if is_promoted is not None:
            base_query = base_query.where(ProductPairing.is_promoted == is_promoted)
            count_query = count_query.where(ProductPairing.is_promoted == is_promoted)

        total_res = await self.session.execute(count_query)
        total = total_res.scalar_one()

        stmt = (
            base_query.options(
                selectinload(ProductPairing.source_product),
                selectinload(ProductPairing.target_product),
            )
            .order_by(desc(ProductPairing.is_promoted), desc(ProductPairing.co_purchase_score))
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all()), total

    async def create(self, pairing_in: ProductPairingCreate) -> ProductPairing:
        """
        Create a new product pairing.
        """
        pairing = ProductPairing(
            source_product_id=pairing_in.source_product_id,
            target_product_id=pairing_in.target_product_id,
            co_purchase_score=pairing_in.co_purchase_score,
            is_promoted=pairing_in.is_promoted,
            min_margin_threshold=pairing_in.min_margin_threshold,
        )
        self.session.add(pairing)
        await self.session.flush()
        await self.session.refresh(pairing)
        return pairing

    async def update(
        self, pairing: ProductPairing, pairing_in: ProductPairingUpdate
    ) -> ProductPairing:
        """
        Update an existing product pairing.
        """
        update_data = pairing_in.model_dump(exclude_unset=True)
        for field, val in update_data.items():
            setattr(pairing, field, val)

        self.session.add(pairing)
        await self.session.flush()
        await self.session.refresh(pairing)
        return pairing

    async def delete(self, pairing: ProductPairing) -> None:
        """
        Delete a product pairing.
        """
        await self.session.delete(pairing)
        await self.session.flush()
