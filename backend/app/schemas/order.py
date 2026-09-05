from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field

from app.models.order import OrderStatus
from app.schemas.subscription import InvoiceResponse, SubscriptionResponse
from app.schemas.warehouse import FulfillmentSplitResponse


class OrderCreateRequest(BaseModel):
    quotation_id: uuid.UUID = Field(..., description="Quotation UUID to convert into an Order")


class OrderLineResponse(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    product_id: uuid.UUID
    product_name: Optional[str] = None
    variant_id: Optional[uuid.UUID] = None
    quantity: int
    unit_price: float
    discount_percent: float
    line_total: float
    margin_percent: float

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    id: uuid.UUID
    order_number: str
    quotation_id: Optional[uuid.UUID] = None
    customer_id: uuid.UUID
    sales_rep_id: Optional[uuid.UUID] = None
    status: OrderStatus
    total_amount: float
    currency: str
    created_at: datetime
    updated_at: datetime
    lines: List[OrderLineResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class OrderDetailResponse(OrderResponse):
    fulfillment_splits: List[FulfillmentSplitResponse] = Field(default_factory=list)
    invoices: List[InvoiceResponse] = Field(default_factory=list)
    subscriptions: List[SubscriptionResponse] = Field(default_factory=list)


class OrderFulfillmentProcessResponse(BaseModel):
    order_id: uuid.UUID
    order_status: OrderStatus
    splits_fulfilled: int
    splits_backordered: int
    total_splits: int
    details: List[FulfillmentSplitResponse]


class OrderListResponse(BaseModel):
    items: List[OrderResponse]
    total: int
    page: int
    page_size: int
