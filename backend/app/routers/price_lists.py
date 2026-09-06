from typing import Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.price_list import (
    PriceListCreate,
    PriceListListResponse,
    PriceListResponse,
    PriceListUpdate,
)
from app.services.pricing_service import PricingService
from app.routers.events import publish_event

router = APIRouter(prefix="/price-lists", tags=["Price Lists"])


@router.get(
    "",
    response_model=PriceListListResponse,
    summary="List price schedules with pagination & filters",
)
async def list_price_lists(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    product_id: Optional[uuid.UUID] = Query(default=None, description="Filter by product ID"),
    customer_tier: Optional[str] = Query(default=None, description="Filter by customer tier"),
    session: AsyncSession = Depends(get_db),
) -> PriceListListResponse:
    """
    Retrieve all governed price schedules filtered by tier or associated product.
    """
    service = PricingService(session)
    return await service.list_price_lists(
        page=page,
        page_size=page_size,
        product_id=product_id,
        customer_tier=customer_tier,
    )


@router.post(
    "",
    response_model=PriceListResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new price list entry (Admin)",
)
async def create_price_list(
    price_list_in: PriceListCreate,
    session: AsyncSession = Depends(get_db),
) -> PriceListResponse:
    """
    Establish a governed price schedule specifying base price, currency, customer tier, and active window.
    """
    service = PricingService(session)
    price_list = await service.create_price_list(price_list_in)
    validated = PriceListResponse.model_validate(price_list)
    await publish_event("price_lists", {"action": "create", "priceList": validated.model_dump(mode="json")})
    return validated


@router.get(
    "/{price_list_id}",
    response_model=PriceListResponse,
    summary="Get price list entry by ID",
)
async def get_price_list(
    price_list_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
) -> PriceListResponse:
    """
    Retrieve single price schedule details.
    """
    service = PricingService(session)
    price_list = await service.get_price_list_or_404(price_list_id)
    return PriceListResponse.model_validate(price_list)


@router.put(
    "/{price_list_id}",
    response_model=PriceListResponse,
    summary="Update price list entry (Admin)",
)
async def update_price_list(
    price_list_id: uuid.UUID,
    price_list_in: PriceListUpdate,
    session: AsyncSession = Depends(get_db),
) -> PriceListResponse:
    """
    Update pricing, customer tier linkage, or effective date bounds.
    """
    service = PricingService(session)
    updated = await service.update_price_list(price_list_id, price_list_in)
    validated = PriceListResponse.model_validate(updated)
    await publish_event("price_lists", {"action": "update", "priceList": validated.model_dump(mode="json")})
    return validated


@router.delete(
    "/{price_list_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete price list entry (Admin)",
)
async def delete_price_list(
    price_list_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
) -> None:
    """
    Remove an obsolete or invalid price schedule entry.
    """
    service = PricingService(session)
    await service.delete_price_list(price_list_id)
    await publish_event("price_lists", {"action": "delete", "priceListId": str(price_list_id)})

