import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.subscription import (
    SubscriptionCancelRequest,
    SubscriptionCancelResponse,
    SubscriptionPlanCreate,
    SubscriptionPlanListResponse,
    SubscriptionPlanResponse,
    SubscriptionQuantityChangeRequest,
    SubscriptionQuantityChangeResponse,
    SubscriptionResponse,
)
from app.services.subscription_service import SubscriptionService

router = APIRouter(tags=["Subscriptions & Plans"])


# ------------------------------------------------------------------------------
# Subscription Plans Endpoints
# ------------------------------------------------------------------------------

@router.get(
    "/subscription-plans",
    response_model=SubscriptionPlanListResponse,
    summary="List available recurring subscription plans",
)
async def list_subscription_plans(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    session: AsyncSession = Depends(get_db),
) -> SubscriptionPlanListResponse:
    """
    Retrieve configured subscription intervals, trial periods, and cancellation terms.
    """
    service = SubscriptionService(session)
    return await service.list_plans(page=page, page_size=page_size)


@router.post(
    "/subscription-plans",
    response_model=SubscriptionPlanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new recurring subscription plan (Admin)",
)
async def create_subscription_plan(
    plan_in: SubscriptionPlanCreate,
    session: AsyncSession = Depends(get_db),
) -> SubscriptionPlanResponse:
    """
    Register a recurring billing plan schedule linked to a SaaS catalog product.
    """
    service = SubscriptionService(session)
    return await service.create_plan(plan_in)


# ------------------------------------------------------------------------------
# Active Subscription Modification Endpoints
# ------------------------------------------------------------------------------

@router.get(
    "/subscriptions/{subscription_id}",
    response_model=SubscriptionResponse,
    summary="Get subscription details, plan terms, and billing schedule",
)
async def get_subscription(
    subscription_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
) -> SubscriptionResponse:
    """
    Fetch comprehensive subscription contract information.
    """
    service = SubscriptionService(session)
    sub = await service.get_subscription_or_404(subscription_id)
    return SubscriptionResponse.model_validate(sub)


@router.post(
    "/subscriptions/{subscription_id}/change-quantity",
    response_model=SubscriptionQuantityChangeResponse,
    summary="Expand or reduce subscription seats with mid-cycle proration",
)
async def change_subscription_quantity(
    subscription_id: uuid.UUID,
    req: SubscriptionQuantityChangeRequest,
    session: AsyncSession = Depends(get_db),
) -> SubscriptionQuantityChangeResponse:
    """
    Adjust seat count mid-month. Automatically calculates daily proportional proration
    and adjusts next invoice with debit/credit.
    """
    service = SubscriptionService(session)
    return await service.change_quantity(
        subscription_id=subscription_id,
        new_quantity=req.new_quantity,
        idempotency_key=req.idempotency_key,
    )


@router.post(
    "/subscriptions/{subscription_id}/cancel",
    response_model=SubscriptionCancelResponse,
    summary="Cancel subscription and auto-generate credit note for unspent days",
)
async def cancel_subscription(
    subscription_id: uuid.UUID,
    req: SubscriptionCancelRequest,
    session: AsyncSession = Depends(get_db),
) -> SubscriptionCancelResponse:
    """
    Terminate subscription contract and issue credit note for remaining unspent cycle days.
    """
    service = SubscriptionService(session)
    return await service.cancel_subscription(
        subscription_id=subscription_id,
        reason=req.reason,
    )
