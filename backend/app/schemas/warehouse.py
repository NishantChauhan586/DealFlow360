from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field
from app.models.warehouse import FulfillmentSplitStatus
from app.schemas.product import ProductResponse


# ------------------------------------------------------------------------------
# Warehouse Schemas
# ------------------------------------------------------------------------------

class WarehouseBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Warehouse facility name")
    address: str = Field(..., min_length=1, max_length=500, description="Physical warehouse address")
    shipping_cost_weight: float = Field(
        default=1.0, ge=0.1, le=10.0, description="Logistics shipping multiplier (lower = cheaper)"
    )
    is_active: bool = Field(default=True, description="Whether the warehouse is operational")


class WarehouseCreate(WarehouseBase):
    pass


class WarehouseUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    address: Optional[str] = Field(default=None, min_length=1, max_length=500)
    shipping_cost_weight: Optional[float] = Field(default=None, ge=0.1, le=10.0)
    is_active: Optional[bool] = None


class WarehouseResponse(WarehouseBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class WarehouseListResponse(BaseModel):
    items: List[WarehouseResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ------------------------------------------------------------------------------
# Inventory Schemas
# ------------------------------------------------------------------------------

class InventoryUpdatePayload(BaseModel):
    product_id: uuid.UUID = Field(..., description="Target catalog product ID")
    quantity_on_hand: int = Field(..., ge=0, description="Physical inventory in stock")
    reserved_quantity: Optional[int] = Field(default=0, ge=0, description="Reserved stock for open orders")
    reorder_point: Optional[int] = Field(default=10, ge=0, description="Safety reorder threshold")


class InventoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    warehouse_id: uuid.UUID
    product_id: uuid.UUID
    quantity_on_hand: int
    reserved_quantity: int
    available_quantity: int
    reorder_point: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    product: Optional[ProductResponse] = None


# ------------------------------------------------------------------------------
# Fulfillment Split & Override Schemas
# ------------------------------------------------------------------------------

class FulfillmentSplitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_id: uuid.UUID
    product_id: Optional[uuid.UUID]
    warehouse_id: Optional[uuid.UUID]
    allocated_quantity: int
    shipping_cost: float
    status: FulfillmentSplitStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    warehouse: Optional[WarehouseResponse] = None
    product: Optional[ProductResponse] = None


class FulfillmentPlanResponse(BaseModel):
    order_id: uuid.UUID
    splits: List[FulfillmentSplitResponse]
    total_allocated: int
    total_backordered: int
    total_shipping_cost: float
    is_fully_fulfillable: bool
    explanation: str


class FulfillmentOverrideItem(BaseModel):
    product_id: uuid.UUID
    warehouse_id: Optional[uuid.UUID] = None
    allocated_quantity: int = Field(..., ge=0)
    status: Optional[FulfillmentSplitStatus] = None


class FulfillmentOverrideRequest(BaseModel):
    overrides: List[FulfillmentOverrideItem] = Field(
        ..., min_length=1, description="List of manual warehouse allocations"
    )
