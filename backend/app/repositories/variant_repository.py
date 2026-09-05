from typing import List, Optional
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import ProductVariant
from app.schemas.product import ProductVariantCreate, ProductVariantUpdate


class VariantRepository:
    """
    Data access repository for ProductVariant records.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, variant_id: uuid.UUID) -> Optional[ProductVariant]:
        """
        Fetch a variant by primary key.
        """
        stmt = select(ProductVariant).where(ProductVariant.id == variant_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_product_id(self, product_id: uuid.UUID) -> List[ProductVariant]:
        """
        List all variants associated with a given product.
        """
        stmt = (
            select(ProductVariant)
            .where(ProductVariant.product_id == product_id)
            .order_by(ProductVariant.created_at.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(
        self, product_id: uuid.UUID, variant_in: ProductVariantCreate
    ) -> ProductVariant:
        """
        Create and persist a new variant for a product.
        """
        db_variant = ProductVariant(
            product_id=product_id,
            attributes=variant_in.attributes,
            extra_price=variant_in.extra_price,
        )
        self.session.add(db_variant)
        await self.session.flush()
        await self.session.refresh(db_variant)
        return db_variant

    async def update(
        self, db_variant: ProductVariant, variant_in: ProductVariantUpdate
    ) -> ProductVariant:
        """
        Update an existing product variant.
        """
        update_data = variant_in.model_dump(exclude_unset=True)
        for field, val in update_data.items():
            setattr(db_variant, field, val)

        self.session.add(db_variant)
        await self.session.flush()
        await self.session.refresh(db_variant)
        return db_variant

    async def delete(self, db_variant: ProductVariant) -> None:
        """
        Delete a variant record.
        """
        await self.session.delete(db_variant)
        await self.session.flush()
