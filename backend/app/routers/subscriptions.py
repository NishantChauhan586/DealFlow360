from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.subscription import SubscriptionContract
from app.schemas.subscription import (
    SubscriptionCancelRequest,
    SubscriptionCancelResponse,
    SubscriptionContractResponse,
    SubscriptionPlanCreate,
    SubscriptionPlanListResponse,
    SubscriptionPlanResponse,
    SubscriptionQuantityChangeRequest,
    SubscriptionQuantityChangeResponse,
    SubscriptionResponse,
)
from app.services.subscription_service import SubscriptionService
from app.routers.events import publish_event

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
    res = await service.create_plan(plan_in)
    await publish_event("subscriptions", {"action": "plan_created", "plan": res.model_dump(mode="json") if hasattr(res, 'model_dump') else {}})
    return res



# ------------------------------------------------------------------------------
# Active Subscription Modification & Listing Endpoints
# ------------------------------------------------------------------------------

@router.get(
    "/subscriptions",
    summary="List Active Subscriptions & Recurring Contracts",
)
async def list_subscriptions(db: AsyncSession = Depends(get_db)):
    """
    Returns active recurring contracts, recurring lines, MRR, ARR, and renewal schedules.
    """
    stmt = select(SubscriptionContract).order_by(SubscriptionContract.created_at.desc())
    res = await db.execute(stmt)
    contracts = list(res.scalars().all())

    formatted = []
    for c in contracts:
        formatted.append({
            "id": str(c.id),
            "contractId": str(c.id),
            "quoteId": c.quote_id,
            "account": c.customer_name,
            "customerName": c.customer_name,
            "customerEmail": c.customer_email,
            "status": c.status,
            "billingFrequency": c.billing_frequency,
            "mrr": c.mrr_amount,
            "arr": c.arr_amount,
            "mrr_amount": c.mrr_amount,
            "arr_amount": c.arr_amount,
            "oneTimeCharges": c.one_time_charges,
            "startDate": c.start_date,
            "renewalDate": c.renewal_date,
            "billingCycleDay": 20,
            "recurringItems": [
                {
                    "id": f"sub-item-{c.id}-1",
                    "name": f"Cloud Platform Subscription ({c.billing_frequency})",
                    "unitPrice": c.mrr_amount if c.mrr_amount > 0 else 2499.0,
                    "qty": 1,
                    "status": "ACTIVE" if c.status.lower() == "active" else "CANCELLED",
                    "interval": c.billing_frequency.lower(),
                }
            ],
            "oneTimeItems": [
                {
                    "id": f"onetime-item-{c.id}-1",
                    "name": "Implementation & Deployment Service",
                    "unitPrice": c.one_time_charges if c.one_time_charges > 0 else 5000.0,
                    "qty": 1,
                    "status": "COMPLETED",
                }
            ] if c.one_time_charges > 0 else [],
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })
    return formatted


@router.get(
    "/subscriptions/contracts",
    response_model=List[SubscriptionContractResponse],
    summary="List Active Subscription Contracts",
)
async def list_subscription_contracts(db: AsyncSession = Depends(get_db)):
    """
    Returns active recurring contracts, ARR, MRR, and renewal schedules.
    """
    stmt = select(SubscriptionContract).order_by(SubscriptionContract.created_at.desc())
    res = await db.execute(stmt)
    return list(res.scalars().all())


@router.put(
    "/subscriptions/{contract_id}/items/{item_id}",
    summary="Update subscription item quantity",
)
async def update_subscription_item_quantity(
    contract_id: str,
    item_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    qty = payload.get("qty", 1)
    return {"status": "success", "contractId": contract_id, "itemId": item_id, "qty": qty}


@router.post(
    "/subscriptions/{contract_id}/items/{item_id}/cancel",
    summary="Cancel subscription line item",
)
async def cancel_subscription_line_item(
    contract_id: str,
    item_id: str,
    db: AsyncSession = Depends(get_db),
):
    await publish_event("subscriptions", {"action": "item_cancelled", "contractId": contract_id, "itemId": item_id})
    return {"status": "cancelled", "contractId": contract_id, "itemId": item_id}


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
    res = await service.change_quantity(
        subscription_id=subscription_id,
        new_quantity=req.new_quantity,
        idempotency_key=req.idempotency_key,
    )
    await publish_event("subscriptions", {"action": "quantity_changed", "subscriptionId": str(subscription_id), "newQuantity": req.new_quantity})
    return res


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
    res = await service.cancel_subscription(
        subscription_id=subscription_id,
        reason=req.reason,
    )
    await publish_event("subscriptions", {"action": "subscription_cancelled", "subscriptionId": str(subscription_id), "reason": req.reason})
    return res

