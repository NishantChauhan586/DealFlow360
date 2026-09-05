from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.models.product import ProductCategory
from app.models.quotation import QuotationLine
from app.models.subscription import (
    BillingSchedule,
    BillingScheduleStatus,
    CreditNote,
    CreditNoteStatus,
    Subscription,
    SubscriptionInterval,
    SubscriptionPlan,
    SubscriptionStatus,
)
from app.repositories.subscription_repository import SubscriptionRepository
from app.schemas.subscription import (
    SubscriptionCancelResponse,
    SubscriptionPlanCreate,
    SubscriptionPlanListResponse,
    SubscriptionPlanResponse,
    SubscriptionQuantityChangeResponse,
    SubscriptionResponse,
)
from app.services.proration_service import ProrationService
from app.services.quotation_service import log_audit_event

logger = structlog.get_logger(__name__)


def calculate_cycle_end(start_date: datetime, interval: SubscriptionInterval, count: int = 1) -> datetime:
    """Helper to compute next billing cycle timestamp."""
    if interval == SubscriptionInterval.MONTHLY:
        # Approximate 30 days per month
        return start_date + timedelta(days=30 * count)
    elif interval == SubscriptionInterval.QUARTERLY:
        return start_date + timedelta(days=90 * count)
    elif interval == SubscriptionInterval.YEARLY:
        return start_date + timedelta(days=365 * count)
    return start_date + timedelta(days=30 * count)


class SubscriptionService:
    """
    Business service managing recurring subscriptions, seat expansion proration, and cancellation credit notes.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.sub_repo = SubscriptionRepository(session)
        self.proration_service = ProrationService()

    async def get_subscription_or_404(
        self, subscription_id: uuid.UUID
    ) -> Subscription:
        sub = await self.sub_repo.get_subscription_by_id(subscription_id)
        if not sub:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subscription with ID '{subscription_id}' was not found.",
            )
        return sub

    async def list_plans(
        self, page: int = 1, page_size: int = 20
    ) -> SubscriptionPlanListResponse:
        skip = (page - 1) * page_size
        items, total = await self.sub_repo.list_plans(skip=skip, limit=page_size)
        return SubscriptionPlanListResponse(
            items=[SubscriptionPlanResponse.model_validate(p) for p in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=max(1, (total + page_size - 1) // page_size),
        )

    async def create_plan(
        self, plan_in: SubscriptionPlanCreate
    ) -> SubscriptionPlanResponse:
        plan = await self.sub_repo.create_plan(plan_in)
        await self.session.commit()
        return SubscriptionPlanResponse.model_validate(plan)

    async def create_subscription_from_line(
        self,
        order_id: uuid.UUID,
        customer_id: uuid.UUID,
        line: QuotationLine,
        plan_id: Optional[uuid.UUID] = None,
        start_date: Optional[datetime] = None,
    ) -> Subscription:
        """
        Instantiate an active subscription contract from an approved order line item.
        """
        now = start_date or datetime.now(timezone.utc)

        # Lookup plan or find default plan for product
        if plan_id:
            plan = await self.sub_repo.get_plan_by_id(plan_id)
        else:
            plan = await self.sub_repo.get_plan_by_product(line.product_id)

        if not plan:
            # Create a default monthly plan on the fly if none exists
            plan_in = SubscriptionPlanCreate(
                product_id=line.product_id,
                interval=SubscriptionInterval.MONTHLY,
                interval_count=1,
                cancellation_policy={"allow_mid_cycle_refund": True},
            )
            plan = await self.sub_repo.create_plan(plan_in)

        sub = Subscription(
            order_id=order_id,
            customer_id=customer_id,
            product_id=line.product_id,
            plan_id=plan.id,
            start_date=now,
            status=SubscriptionStatus.ACTIVE,
            quantity=line.quantity,
            unit_price=line.unit_price,
            prorated_amount=0.0,
        )
        created_sub = await self.sub_repo.create_subscription(sub)

        # Generate initial billing schedule entry
        cycle_end = calculate_cycle_end(now, plan.interval, plan.interval_count)
        first_schedule = BillingSchedule(
            subscription_id=created_sub.id,
            invoice_date=cycle_end,
            amount_due=round(line.unit_price * line.quantity, 2),
            status=BillingScheduleStatus.PENDING,
        )
        await self.sub_repo.create_schedule(first_schedule)

        logger.info(
            "subscription_created",
            subscription_id=str(created_sub.id),
            order_id=str(order_id),
            qty=created_sub.quantity,
        )
        return created_sub

    async def change_quantity(
        self,
        subscription_id: uuid.UUID,
        new_quantity: int,
        idempotency_key: Optional[str] = None,
        as_of_date: Optional[datetime] = None,
    ) -> SubscriptionQuantityChangeResponse:
        """
        Handle mid-cycle seat expansions / reductions with mathematical proration.
        Updates next scheduled bill with prorated debit/credit adjustment.
        """
        sub = await self.get_subscription_or_404(subscription_id)
        if sub.status != SubscriptionStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot adjust quantity on subscription with status '{sub.status.value}'.",
            )

        now = as_of_date or datetime.now(timezone.utc)
        plan = sub.plan
        interval = plan.interval if plan else SubscriptionInterval.MONTHLY
        interval_count = plan.interval_count if plan else 1

        next_schedule = await self.sub_repo.get_next_pending_schedule(sub.id)
        if next_schedule:
            next_bill_date = next_schedule.invoice_date
            cycle_start = sub.start_date
        else:
            cycle_start = sub.start_date
            next_bill_date = calculate_cycle_end(cycle_start, interval, interval_count)

        # Compute proration adjustment
        proration_res = await self.proration_service.calculate_prorated_adjustment(
            old_quantity=sub.quantity,
            new_quantity=new_quantity,
            current_date=now,
            next_billing_date=next_bill_date,
            cycle_start_date=cycle_start,
            unit_price_per_cycle=sub.unit_price,
            idempotency_key=idempotency_key,
        )

        old_qty = sub.quantity
        sub.quantity = new_quantity
        sub.prorated_amount = proration_res.prorated_amount
        await self.sub_repo.save_subscription(sub)

        # Adjust next pending invoice amount
        base_next_cycle_amount = round(new_quantity * sub.unit_price, 2)
        if proration_res.adjustment_type == "debit":
            next_bill_amount = round(base_next_cycle_amount + proration_res.prorated_amount, 2)
        elif proration_res.adjustment_type == "credit":
            next_bill_amount = max(0.0, round(base_next_cycle_amount - proration_res.prorated_amount, 2))
        else:
            next_bill_amount = base_next_cycle_amount

        if next_schedule:
            next_schedule.amount_due = next_bill_amount
            self.session.add(next_schedule)

        await self.session.commit()

        await log_audit_event(
            action="SUBSCRIPTION_QUANTITY_CHANGED",
            entity_type="Subscription",
            entity_id=sub.id,
            payload={
                "old_quantity": old_qty,
                "new_quantity": new_quantity,
                "prorated_amount": proration_res.prorated_amount,
                "adjustment_type": proration_res.adjustment_type,
                "next_bill_amount": next_bill_amount,
            },
        )

        return SubscriptionQuantityChangeResponse(
            subscription_id=sub.id,
            old_quantity=old_qty,
            new_quantity=new_quantity,
            prorated_amount=proration_res.prorated_amount,
            adjustment_type=proration_res.adjustment_type,
            next_billing_amount=next_bill_amount,
            explanation=proration_res.explanation,
        )

    async def cancel_subscription(
        self,
        subscription_id: uuid.UUID,
        reason: Optional[str] = None,
        as_of_date: Optional[datetime] = None,
    ) -> SubscriptionCancelResponse:
        """
        Cancel subscription contract mid-cycle and auto-generate a CreditNote for unused days.
        """
        sub = await self.get_subscription_or_404(subscription_id)
        if sub.status != SubscriptionStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Subscription is already in status '{sub.status.value}'.",
            )

        now = as_of_date or datetime.now(timezone.utc)
        sub.status = SubscriptionStatus.CANCELLED
        sub.end_date = now

        # Calculate unspent fraction of current cycle for refund
        next_schedule = await self.sub_repo.get_next_pending_schedule(sub.id)
        refund_amount = 0.0
        credit_note: Optional[CreditNote] = None

        if next_schedule:
            # Mark next pending schedule as failed/voided
            next_schedule.status = BillingScheduleStatus.FAILED
            self.session.add(next_schedule)

            cycle_start = sub.start_date
            next_bill_date = next_schedule.invoice_date
            total_days = max(1, (next_bill_date.date() - cycle_start.date()).days)
            days_remaining = max(0, (next_bill_date.date() - now.date()).days)
            fraction_remaining = min(1.0, days_remaining / total_days)

            monthly_cost = sub.quantity * sub.unit_price
            refund_amount = round(monthly_cost * fraction_remaining, 2)

        if refund_amount > 0:
            cn_number = f"CN-{uuid.uuid4().hex[:8].upper()}"
            credit_note = CreditNote(
                subscription_id=sub.id,
                invoice_id=None,
                credit_note_number=cn_number,
                amount=refund_amount,
                reason=reason or "Mid-cycle subscription cancellation refund",
                status=CreditNoteStatus.ISSUED,
            )
            await self.sub_repo.create_credit_note(credit_note)

        await self.sub_repo.save_subscription(sub)
        await self.session.commit()

        explanation = (
            f"Subscription cancelled. Refund credit note of ${refund_amount:.2f} generated "
            f"for {days_remaining if next_schedule else 0} remaining unspent days in cycle."
            if refund_amount > 0
            else "Subscription cancelled with no refundable balance."
        )

        await log_audit_event(
            action="SUBSCRIPTION_CANCELLED",
            entity_type="Subscription",
            entity_id=sub.id,
            payload={
                "refund_amount": refund_amount,
                "credit_note_number": credit_note.credit_note_number if credit_note else None,
                "reason": reason,
            },
        )

        return SubscriptionCancelResponse(
            subscription_id=sub.id,
            status=sub.status,
            refund_amount=refund_amount,
            credit_note_number=credit_note.credit_note_number if credit_note else None,
            credit_note_id=credit_note.id if credit_note else None,
            explanation=explanation,
        )
