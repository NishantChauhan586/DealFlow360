import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.subscription import OrderInvoicesResponse
from app.schemas.warehouse import (
    FulfillmentOverrideRequest,
    FulfillmentPlanResponse,
)
from app.services.billing_service import BillingService
from app.services.fulfillment_override_service import FulfillmentOverrideService
from app.services.warehouse_splitter import WarehouseSplitter

router = APIRouter(prefix="/orders", tags=["Fulfillment & Billing"])


# ------------------------------------------------------------------------------
# Fulfillment & Warehouse Split Endpoints
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
    Execute greedy cost-optimal multi-warehouse inventory allocation for an order/quotation.
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
