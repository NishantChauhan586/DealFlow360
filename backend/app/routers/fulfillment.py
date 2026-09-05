from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.fulfillment import Warehouse, FulfillmentRecord
from app.schemas.fulfillment import WarehouseResponse, FulfillmentAllocateRequest, FulfillmentResponse

router = APIRouter(prefix="/fulfillment", tags=["Fulfillment & Warehouse Split"])


@router.get("/warehouses", response_model=List[WarehouseResponse], summary="List Warehouse Stock Levels")
async def list_warehouses(db: AsyncSession = Depends(get_db)):
    """
    Returns live inventory stock levels across global warehouse nodes (US-East, EU-Central, APAC).
    """
    stmt = select(Warehouse)
    res = await db.execute(stmt)
    warehouses = list(res.scalars().all())
    return warehouses


@router.post("/allocate", response_model=FulfillmentResponse, summary="Allocate Warehouse Stock for Quote")
async def allocate_fulfillment(payload: FulfillmentAllocateRequest, db: AsyncSession = Depends(get_db)):
    """
    Allocates stock from specified warehouse node.
    """
    stmt = select(Warehouse).where(Warehouse.code == payload.warehouse_code)
    res = await db.execute(stmt)
    warehouse = res.scalar_one_or_none()

    if not warehouse:
        raise HTTPException(status_code=404, detail=f"Warehouse {payload.warehouse_code} not found.")

    qty = payload.allocated_quantity
    shipped = min(qty, warehouse.available_units)
    backorder = max(0, qty - shipped)
    status_str = "Shipped" if backorder == 0 else "Partial"

    warehouse.available_units -= shipped
    warehouse.reserved_units += shipped

    record = FulfillmentRecord(
        quote_id=payload.quote_id,
        warehouse_code=payload.warehouse_code,
        allocated_quantity=qty,
        shipped_quantity=shipped,
        backorder_quantity=backorder,
        status=status_str,
        tracking_number=f"TRK-{warehouse.code}-99281",
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record
