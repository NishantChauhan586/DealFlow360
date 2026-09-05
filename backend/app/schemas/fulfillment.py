from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

base_config = ConfigDict(
    from_attributes=True,
    populate_by_name=True,
    alias_generator=to_camel,
)


class WarehouseResponse(BaseModel):
    model_config = base_config

    id: int
    code: str
    name: str
    location: str
    available_units: int
    reserved_units: int


class FulfillmentAllocateRequest(BaseModel):
    model_config = base_config

    quote_id: str
    warehouse_code: str
    allocated_quantity: int


class FulfillmentResponse(BaseModel):
    model_config = base_config

    id: int
    quote_id: str
    warehouse_code: str
    allocated_quantity: int
    shipped_quantity: int
    backorder_quantity: int
    status: str
    tracking_number: Optional[str] = None

