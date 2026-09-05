import math
from typing import Optional
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.models.product import Product, ProductCategory, ProductVariant
from app.repositories.product_repository import ProductRepository
from app.repositories.variant_repository import VariantRepository
from app.schemas.product import (
    ProductCreate,
    ProductListResponse,
    ProductResponse,
    ProductUpdate,
    ProductVariantCreate,
    ProductVariantResponse,
)

logger = structlog.get_logger(__name__)


class ProductService:
    """
    Business service layer managing Product catalog lifecycle, variants, and validation.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.product_repo = ProductRepository(session)
        self.variant_repo = VariantRepository(session)

    async def get_product_or_404(self, product_id: uuid.UUID) -> Product:
        """
        Fetch a product by ID or raise an RFC 7807 compatible 404 HTTPException.
        """
        product = await self.product_repo.get_by_id(product_id)
        if not product:
            logger.warning("product_not_found", product_id=str(product_id))
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID '{product_id}' was not found.",
            )
        return product

    async def list_products(
        self,
        page: int = 1,
        page_size: int = 20,
        category: Optional[ProductCategory] = None,
        is_active: Optional[bool] = None,
    ) -> ProductListResponse:
        """
        Retrieve paginated list of catalog products.
        """
        if page < 1:
            page = 1
        if page_size < 1 or page_size > 100:
            page_size = 20

        skip = (page - 1) * page_size
        items, total = await self.product_repo.list_products(
            skip=skip,
            limit=page_size,
            category=category,
            is_active=is_active,
        )

        total_pages = math.ceil(total / page_size) if total > 0 else 1

        return ProductListResponse(
            items=[ProductResponse.model_validate(p) for p in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    async def create_product(self, product_in: ProductCreate) -> Product:
        """
        Validate and create a new catalog product.
        """
        logger.info(
            "creating_product",
            name=product_in.name,
            category=product_in.category,
        )
        product = await self.product_repo.create(product_in)
        await self.session.commit()
        return product

    async def update_product(
        self, product_id: uuid.UUID, product_in: ProductUpdate
    ) -> Product:
        """
        Update an existing product's attributes.
        """
        product = await self.get_product_or_404(product_id)
        updated_product = await self.product_repo.update(product, product_in)
        await self.session.commit()
        logger.info("product_updated", product_id=str(product_id))
        return updated_product

    async def soft_delete_product(self, product_id: uuid.UUID) -> Product:
        """
        Soft delete a product by setting is_active to False.
        """
        product = await self.get_product_or_404(product_id)
        if not product.is_active:
            logger.info("product_already_inactive", product_id=str(product_id))
            return product

        deactivated = await self.product_repo.soft_delete(product)
        await self.session.commit()
        logger.info("product_soft_deleted", product_id=str(product_id))
        return deactivated

    async def add_variant(
        self, product_id: uuid.UUID, variant_in: ProductVariantCreate
    ) -> ProductVariantResponse:
        """
        Add a new SKU variant to an active product.
        """
        product = await self.get_product_or_404(product_id)
        if not product.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot add variants to inactive product '{product.name}'.",
            )

        variant = await self.variant_repo.create(product_id, variant_in)
        await self.session.commit()
        logger.info(
            "variant_created",
            product_id=str(product_id),
            variant_id=str(variant.id),
        )
        return ProductVariantResponse.model_validate(variant)
