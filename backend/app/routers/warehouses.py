import math
from typing import Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.repositories.inventory_repository import InventoryRepository
from app.repositories.warehouse_repository import WarehouseRepository
from app.schemas.warehouse import (
    InventoryResponse,
    InventoryUpdatePayload,
    WarehouseCreate,
    WarehouseListResponse,
    WarehouseResponse,
)

router = APIRouter(prefix="/warehouses", tags=["Warehouse & Inventory"])


@router.get(
    "",
    response_model=WarehouseListResponse,
    summary="List all fulfillment warehouses",
)
async def list_warehouses(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    is_active: Optional[bool] = Query(default=None, description="Filter operational warehouses"),
    session: AsyncSession = Depends(get_db),
) -> WarehouseListResponse:
    """
    Retrieve warehouses ordered by shipping cost efficiency.
    """
    repo = WarehouseRepository(session)
    skip = (page - 1) * page_size
    items, total = await repo.list_warehouses(
        skip=skip,
        limit=page_size,
        is_active=is_active,
    )
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return WarehouseListResponse(
        items=[WarehouseResponse.model_validate(w) for w in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post(
    "",
    response_model=WarehouseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new warehouse facility (Admin)",
)
async def create_warehouse(
    warehouse_in: WarehouseCreate,
    session: AsyncSession = Depends(get_db),
) -> WarehouseResponse:
    """
    Register a new regional warehouse facility with shipping distance multiplier.
    """
    repo = WarehouseRepository(session)
    warehouse = await repo.create(warehouse_in)
    await session.commit()
    return WarehouseResponse.model_validate(warehouse)


@router.patch(
    "/{warehouse_id}/inventory",
    response_model=InventoryResponse,
    summary="Update or initialize product inventory in a warehouse",
)
async def update_warehouse_inventory(
    warehouse_id: uuid.UUID,
    payload: InventoryUpdatePayload,
    session: AsyncSession = Depends(get_db),
) -> InventoryResponse:
    """
    Set physical on-hand quantity, reserved count, and reorder point for a product.
    """
    wh_repo = WarehouseRepository(session)
    wh = await wh_repo.get_by_id(warehouse_id)
    if not wh:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Warehouse with ID '{warehouse_id}' was not found.",
        )

    inv_repo = InventoryRepository(session)
    inv = await inv_repo.upsert_stock(warehouse_id, payload)
    await session.commit()
    return InventoryResponse.model_validate(inv)
