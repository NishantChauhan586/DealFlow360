from typing import Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.product import ProductCategory
from app.schemas.product import (
    ProductCreate,
    ProductListResponse,
    ProductResponse,
    ProductUpdate,
    ProductVariantCreate,
    ProductVariantResponse,
)
from app.services.product_service import ProductService
from app.routers.events import publish_event

router = APIRouter(prefix="/products", tags=["Products"])


@router.get(
    "",
    response_model=ProductListResponse,
    summary="List catalog products with pagination & filtering",
)
async def list_products(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    category: Optional[ProductCategory] = Query(default=None, description="Filter by category"),
    is_active: Optional[bool] = Query(default=None, description="Filter active/inactive products"),
    session: AsyncSession = Depends(get_db),
) -> ProductListResponse:
    """
    Retrieve paginated product catalog with category and activity status filters.
    """
    service = ProductService(session)
    return await service.list_products(
        page=page,
        page_size=page_size,
        category=category,
        is_active=is_active,
    )


@router.post(
    "",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new catalog product (Admin)",
)
async def create_product(
    product_in: ProductCreate,
    session: AsyncSession = Depends(get_db),
) -> ProductResponse:
    """
    Create a new product definition with tax rate and category specifications.
    """
    service = ProductService(session)
    product = await service.create_product(product_in)
    validated = ProductResponse.model_validate(product)
    await publish_event("products", {"action": "create", "productId": str(product.id), "product": validated.model_dump(mode="json")})
    return validated


@router.get(
    "/{product_id}",
    response_model=ProductResponse,
    summary="Get product details and variants by ID",
)
async def get_product(
    product_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
) -> ProductResponse:
    """
    Fetch comprehensive product details including all attached SKU variants.
    """
    service = ProductService(session)
    product = await service.get_product_or_404(product_id)
    return ProductResponse.model_validate(product)


@router.put(
    "/{product_id}",
    response_model=ProductResponse,
    summary="Update product attributes (Admin)",
)
async def update_product(
    product_id: uuid.UUID,
    product_in: ProductUpdate,
    session: AsyncSession = Depends(get_db),
) -> ProductResponse:
    """
    Update details, tax rates, or activation status of an existing product.
    """
    service = ProductService(session)
    product = await service.update_product(product_id, product_in)
    validated = ProductResponse.model_validate(product)
    await publish_event("products", {"action": "update", "productId": str(product.id), "product": validated.model_dump(mode="json")})
    return validated


@router.delete(
    "/{product_id}",
    response_model=ProductResponse,
    summary="Soft delete product (Admin)",
)
async def delete_product(
    product_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
) -> ProductResponse:
    """
    Soft-deactivate a product to prevent new quote inclusion while preserving historical records.
    """
    service = ProductService(session)
    product = await service.soft_delete_product(product_id)
    validated = ProductResponse.model_validate(product)
    await publish_event("products", {"action": "delete", "productId": str(product.id)})
    return validated


@router.post(
    "/{product_id}/variants",
    response_model=ProductVariantResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a SKU variant to a product (Admin)",
)
async def create_product_variant(
    product_id: uuid.UUID,
    variant_in: ProductVariantCreate,
    session: AsyncSession = Depends(get_db),
) -> ProductVariantResponse:
    """
    Attach an attribute-based variant (e.g. Size, Color, Region) with price differential.
    """
    service = ProductService(session)
    variant = await service.add_variant(product_id, variant_in)
    await publish_event("products", {"action": "variant_added", "productId": str(product_id)})
    return variant

