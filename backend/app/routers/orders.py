from typing import Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.order import OrderStatus
from app.schemas.order import (
    OrderCreateRequest,
    OrderDetailResponse,
    OrderFulfillmentProcessResponse,
    OrderListResponse,
)
from app.schemas.subscription import OrderInvoicesResponse
from app.schemas.warehouse import (
    FulfillmentOverrideRequest,
    FulfillmentPlanResponse,
)
from app.services.billing_service import BillingService
from app.services.fulfillment_override_service import FulfillmentOverrideService
from app.services.order_service import OrderService
from app.services.warehouse_splitter import WarehouseSplitter

router = APIRouter(prefix="/orders", tags=["Orders, Fulfillment & Billing"])


# ------------------------------------------------------------------------------
# Core Order Endpoints
# ------------------------------------------------------------------------------

@router.post(
    "",
    response_model=OrderDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Order from approved quotation (connects Fulfillment & Billing)",
)
async def create_order(
    order_in: OrderCreateRequest,
    session: AsyncSession = Depends(get_db),
) -> OrderDetailResponse:
    """
    Convert an approved sales quotation into an official Order:
    1. Instantiates Order with status='pending'.
    2. Itemizes OrderLines from quotation lines.
    3. Runs greedy multi-warehouse stock allocation to generate FulfillmentSplits.
    4. For hardware/services -> Generates one-time Invoices.
    5. For subscriptions -> Provisions Subscription contracts & BillingSchedules.
    6. Dispatches async Celery worker task for fulfillment processing.
    """
    service = OrderService(session)
    return await service.create_order_from_quotation(order_in.quotation_id)


@router.get(
    "/{order_id}",
    response_model=OrderDetailResponse,
    summary="Get full order detail with fulfillment splits, invoices, and subscriptions",
)
async def get_order(
    order_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
) -> OrderDetailResponse:
    """
    Retrieve comprehensive order overview including itemized lines, warehouse fulfillment splits,
    capital invoices, and recurring subscription schedules.
    """
    service = OrderService(session)
    return await service.get_order_detail(order_id)


@router.get(
    "",
    response_model=OrderListResponse,
    summary="List paginated orders with optional customer and status filters",
)
async def list_orders(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    customer_id: Optional[uuid.UUID] = Query(default=None, description="Filter by customer UUID"),
    status: Optional[OrderStatus] = Query(default=None, description="Filter by order status"),
    session: AsyncSession = Depends(get_db),
) -> OrderListResponse:
    """
    Retrieve paginated order ledger.
    """
    service = OrderService(session)
    return await service.list_orders(
        page=page,
        page_size=page_size,
        customer_id=customer_id,
        status_filter=status,
    )


@router.post(
    "/{order_id}/process-fulfillment",
    response_model=OrderFulfillmentProcessResponse,
    summary="Process warehouse stock allocation and transition split status",
)
async def process_order_fulfillment(
    order_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
) -> OrderFulfillmentProcessResponse:
    """
    Execute inventory allocation flow:
    - Available stock splits transition from 'pending' to 'fulfilled'.
    - Shortage stock splits remain marked as 'backordered'.
    - Updates overall Order status accordingly ('fulfilled' or 'processing').
    """
    service = OrderService(session)
    return await service.process_order_fulfillment(order_id)


# ------------------------------------------------------------------------------
# Warehouse Fulfillment Split Endpoints
# ------------------------------------------------------------------------------

@router.get(
    "/{order_id}/fulfillment",
    response_model=FulfillmentPlanResponse,
    summary="Compute and return optimal multi-warehouse fulfillment split",
)
async def get_suggested_fulfillment(
    order_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
) -> FulfillmentPlanResponse:
    """
    Execute greedy cost-optimal multi-warehouse inventory allocation for an order.
    """
    splitter = WarehouseSplitter(session)
    return await splitter.suggest_split(order_id)


@router.post(
    "/{order_id}/fulfillment/override",
    response_model=FulfillmentPlanResponse,
    summary="Apply manual warehouse fulfillment allocation overrides",
)
async def override_order_fulfillment(
    order_id: uuid.UUID,
    override_req: FulfillmentOverrideRequest,
    session: AsyncSession = Depends(get_db),
) -> FulfillmentPlanResponse:
    """
    Manually assign warehouse splits and recalculate shipping costs.
    """
    service = FulfillmentOverrideService(session)
    return await service.apply_manual_override(order_id, override_req)


# ------------------------------------------------------------------------------
# Hybrid Order Billing & Invoice Endpoints
# ------------------------------------------------------------------------------

@router.get(
    "/{order_id}/invoices",
    response_model=OrderInvoicesResponse,
    summary="List all invoices, credit notes, and net balance for an order",
)
async def get_order_invoices(
    order_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
) -> OrderInvoicesResponse:
    """
    Retrieve generated capital hardware/service invoices, subscription invoices, and credit notes.
    """
    service = BillingService(session)
    return await service.get_order_invoices(order_id)


@router.post(
    "/{order_id}/generate-billing",
    response_model=OrderInvoicesResponse,
    summary="Process order confirmation, create hybrid invoices & subscriptions",
)
async def generate_order_billing(
    order_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
) -> OrderInvoicesResponse:
    """
    Execute hybrid billing upon order confirmation:
    - Generates one-time invoice for hardware and services.
    - Creates active Subscriptions + recurring billing schedules for SaaS subscriptions.
    """
    service = BillingService(session)
    return await service.process_order_confirmation(order_id)
