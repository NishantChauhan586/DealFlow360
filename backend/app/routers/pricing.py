from datetime import datetime
from typing import Optional
import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.price_list import PriceLookupRequest, PriceLookupResponse
from app.services.pricing_service import PricingService

router = APIRouter(prefix="/pricing", tags=["Pricing Engine"])


@router.post(
    "/calculate",
    response_model=PriceLookupResponse,
    summary="Calculate governed price for product and customer tier",
)
async def calculate_price(
    request: PriceLookupRequest,
    session: AsyncSession = Depends(get_db),
) -> PriceLookupResponse:
    """
    Execute deterministic multi-tier pricing resolution:
    - 1. Exact match (Product + Customer Tier)
    - 2. Tier-wide fallback (Customer Tier only)
    - 3. Product catalog default (Product only)
    - 4. Global fallback default
    """
    service = PricingService(session)
    return await service.calculate_price(
        product_id=request.product_id,
        customer_tier=request.customer_tier,
        as_of_date=request.as_of_date,
    )


@router.get(
    "/lookup/{product_id}",
    response_model=PriceLookupResponse,
    summary="Quick price lookup for a product",
)
async def lookup_product_price(
    product_id: uuid.UUID,
    tier: Optional[str] = Query(default=None, description="Customer account tier"),
    as_of: Optional[datetime] = Query(default=None, description="Effective point-in-time calculation"),
    session: AsyncSession = Depends(get_db),
) -> PriceLookupResponse:
    """
    Convenience GET endpoint for immediate price lookup on a product.
    """
    service = PricingService(session)
    return await service.calculate_price(
        product_id=product_id,
        customer_tier=tier,
        as_of_date=as_of,
    )
