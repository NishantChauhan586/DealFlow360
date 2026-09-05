from typing import Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.product import ProductCategory
from app.schemas.discount_tier import (
    DiscountLimitLookupResponse,
    DiscountTierCreate,
    DiscountTierListResponse,
    DiscountTierResponse,
    DiscountTierUpdate,
)
from app.services.discount_config_service import DiscountConfigService

router = APIRouter(prefix="/discount-tiers", tags=["Discount Governance"])


@router.get(
    "",
    response_model=DiscountTierListResponse,
    summary="List discount tier rules with pagination & filters (Admin)",
)
async def list_discount_tiers(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    customer_tier: Optional[str] = Query(default=None, description="Filter by customer tier (e.g. bronze, silver, gold)"),
    category: Optional[ProductCategory] = Query(default=None, description="Filter by product category"),
    session: AsyncSession = Depends(get_db),
) -> DiscountTierListResponse:
    """
    Retrieve configured discount limits by customer tier and product category.
    """
    service = DiscountConfigService(session)
    return await service.list_discount_tiers(
        page=page,
        page_size=page_size,
        customer_tier=customer_tier,
        category=category,
    )


@router.get(
    "/limit",
    response_model=DiscountLimitLookupResponse,
    summary="Lookup maximum allowed discount ceiling for tier and category",
)
async def lookup_discount_limit(
    customer_tier: str = Query(..., description="Customer account tier (e.g. bronze, silver, gold)"),
    category: ProductCategory = Query(..., description="Product category (hardware, service, subscription)"),
    session: AsyncSession = Depends(get_db),
) -> DiscountLimitLookupResponse:
    """
    Evaluate deterministic ceiling limit for a deal item line.
    """
    service = DiscountConfigService(session)
    return await service.get_discount_limit(customer_tier, category)


@router.post(
    "",
    response_model=DiscountTierResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new discount tier rule (Admin)",
)
async def create_discount_tier(
    tier_in: DiscountTierCreate,
    session: AsyncSession = Depends(get_db),
) -> DiscountTierResponse:
    """
    Establish an authorized discount percentage ceiling.
    """
    service = DiscountConfigService(session)
    tier = await service.create_discount_tier(tier_in)
    return DiscountTierResponse.model_validate(tier)


@router.get(
    "/{tier_id}",
    response_model=DiscountTierResponse,
    summary="Get discount tier rule by ID (Admin)",
)
async def get_discount_tier(
    tier_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
) -> DiscountTierResponse:
    """
    Retrieve single discount rule details.
    """
    service = DiscountConfigService(session)
    tier = await service.get_tier_or_404(tier_id)
    return DiscountTierResponse.model_validate(tier)


@router.put(
    "/{tier_id}",
    response_model=DiscountTierResponse,
    summary="Update discount tier rule (Admin)",
)
async def update_discount_tier(
    tier_id: uuid.UUID,
    tier_in: DiscountTierUpdate,
    session: AsyncSession = Depends(get_db),
) -> DiscountTierResponse:
    """
    Update maximum discount ceiling or tier categorization.
    """
    service = DiscountConfigService(session)
    updated = await service.update_discount_tier(tier_id, tier_in)
    return DiscountTierResponse.model_validate(updated)


@router.delete(
    "/{tier_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete discount tier rule (Admin)",
)
async def delete_discount_tier(
    tier_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
) -> None:
    """
    Remove a discount configuration rule.
    """
    service = DiscountConfigService(session)
    await service.delete_discount_tier(tier_id)
