from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.upsell import (
    ProductPairingCreate,
    ProductPairingResponse,
    ProductPairingUpdate,
)
from app.services.upsell_service import UpsellService

router = APIRouter(prefix="/product-pairings", tags=["Upsell & Product Pairings (Admin)"])


@router.get(
    "",
    response_model=List[ProductPairingResponse],
    summary="List all configured product pairings",
)
async def list_pairings(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=50, ge=1, le=100, description="Items per page"),
    source_product_id: Optional[uuid.UUID] = Query(default=None, description="Filter by source product ID"),
    is_promoted: Optional[bool] = Query(default=None, description="Filter by strategic promotion status"),
    session: AsyncSession = Depends(get_db),
) -> List[ProductPairingResponse]:
    """
    Retrieve configured product pairings with affinity scores and promotion flags.
    """
    service = UpsellService(session)
    return await service.list_pairings(
        page=page,
        page_size=page_size,
        source_product_id=source_product_id,
        is_promoted=is_promoted,
    )


@router.post(
    "",
    response_model=ProductPairingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new product pairing rule (Admin)",
)
async def create_pairing(
    pairing_in: ProductPairingCreate,
    session: AsyncSession = Depends(get_db),
) -> ProductPairingResponse:
    """
    Create a new product pairing relationship for upsell/cross-sell recommendations.
    """
    service = UpsellService(session)
    return await service.create_pairing(pairing_in)


@router.put(
    "/{pairing_id}",
    response_model=ProductPairingResponse,
    summary="Update a product pairing rule (Admin)",
)
async def update_pairing(
    pairing_id: uuid.UUID,
    pairing_in: ProductPairingUpdate,
    session: AsyncSession = Depends(get_db),
) -> ProductPairingResponse:
    """
    Update affinity score, promotion status, or margin threshold for a pairing.
    """
    service = UpsellService(session)
    return await service.update_pairing(pairing_id, pairing_in)


@router.delete(
    "/{pairing_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a product pairing rule (Admin)",
)
async def delete_pairing(
    pairing_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
) -> None:
    """
    Remove a product pairing configuration.
    """
    service = UpsellService(session)
    await service.delete_pairing(pairing_id)
