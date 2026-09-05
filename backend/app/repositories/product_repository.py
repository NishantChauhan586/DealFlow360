from typing import List, Optional, Tuple
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.product import Product, ProductCategory
from app.schemas.product import ProductCreate, ProductUpdate


class ProductRepository:
    """
    Data access repository for Product entities with asynchronous SQLAlchemy operations.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, product_id: uuid.UUID) -> Optional[Product]:
        """
        Fetch a single product by primary key with eagerly loaded variants.
        """
        stmt = (
            select(Product)
            .where(Product.id == product_id)
            .options(selectinload(Product.variants))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_products(
        self,
        skip: int = 0,
        limit: int = 20,
        category: Optional[ProductCategory] = None,
        is_active: Optional[bool] = None,
    ) -> Tuple[List[Product], int]:
        """
        Retrieve paginated products with filtering and total record count.
        """
        base_query = select(Product)
        count_query = select(func.count()).select_from(Product)

        if category is not None:
            base_query = base_query.where(Product.category == category)
            count_query = count_query.where(Product.category == category)

        if is_active is not None:
            base_query = base_query.where(Product.is_active == is_active)
            count_query = count_query.where(Product.is_active == is_active)

        # Total count
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        # Paginated items
        stmt = (
            base_query.options(selectinload(Product.variants))
            .order_by(Product.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        items = list(result.scalars().all())

        return items, total

    async def create(self, product_in: ProductCreate) -> Product:
        """
        Persist a new product record.
        """
        db_product = Product(
            name=product_in.name,
            category=product_in.category,
            description=product_in.description,
            unit=product_in.unit,
            tax_rate=product_in.tax_rate,
            is_active=product_in.is_active,
        )
        self.session.add(db_product)
        await self.session.flush()
        await self.session.refresh(db_product, ["variants"])
        return db_product

    async def update(self, db_product: Product, product_in: ProductUpdate) -> Product:
        """
        Apply partial updates to an existing product record.
        """
        update_data = product_in.model_dump(exclude_unset=True)
        for field, val in update_data.items():
            setattr(db_product, field, val)

        self.session.add(db_product)
        await self.session.flush()
        await self.session.refresh(db_product, ["variants"])
        return db_product

    async def soft_delete(self, db_product: Product) -> Product:
        """
        Deactivate a product (soft delete) to preserve historical quotes and references.
        """
        db_product.is_active = False
        self.session.add(db_product)
        await self.session.flush()
        await self.session.refresh(db_product, ["variants"])
        return db_product
