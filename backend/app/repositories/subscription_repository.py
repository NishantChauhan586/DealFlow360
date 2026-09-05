from typing import List, Optional, Tuple
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.subscription import (
    BillingSchedule,
    CreditNote,
    Subscription,
    SubscriptionPlan,
    SubscriptionStatus,
)
from app.schemas.subscription import SubscriptionPlanCreate


class SubscriptionRepository:
    """
    Data access repository for Subscription contracts, plans, billing schedules, and credit notes.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # --- Subscription Plans ---
    async def get_plan_by_id(self, plan_id: uuid.UUID) -> Optional[SubscriptionPlan]:
        stmt = (
            select(SubscriptionPlan)
            .where(SubscriptionPlan.id == plan_id)
            .options(selectinload(SubscriptionPlan.product))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_plan_by_product(
        self, product_id: uuid.UUID
    ) -> Optional[SubscriptionPlan]:
        stmt = (
            select(SubscriptionPlan)
            .where(SubscriptionPlan.product_id == product_id)
            .options(selectinload(SubscriptionPlan.product))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_plans(
        self, skip: int = 0, limit: int = 50
    ) -> Tuple[List[SubscriptionPlan], int]:
        count_stmt = select(func.count()).select_from(SubscriptionPlan)
        total_res = await self.session.execute(count_stmt)
        total = total_res.scalar_one()

        stmt = (
            select(SubscriptionPlan)
            .options(selectinload(SubscriptionPlan.product))
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all()), total

    async def create_plan(self, plan_in: SubscriptionPlanCreate) -> SubscriptionPlan:
        plan = SubscriptionPlan(
            product_id=plan_in.product_id,
            interval=plan_in.interval,
            interval_count=plan_in.interval_count,
            trial_period_days=plan_in.trial_period_days,
            cancellation_policy=plan_in.cancellation_policy,
        )
        self.session.add(plan)
        await self.session.flush()
        await self.session.refresh(plan, ["product"])
        return plan

    # --- Subscriptions ---
    async def get_subscription_by_id(
        self, subscription_id: uuid.UUID
    ) -> Optional[Subscription]:
        stmt = (
            select(Subscription)
            .where(Subscription.id == subscription_id)
            .options(
                selectinload(Subscription.plan),
                selectinload(Subscription.product),
                selectinload(Subscription.billing_schedules),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_subscriptions(
        self,
        skip: int = 0,
        limit: int = 20,
        customer_id: Optional[uuid.UUID] = None,
        status: Optional[SubscriptionStatus] = None,
    ) -> Tuple[List[Subscription], int]:
        base_query = select(Subscription)
        count_query = select(func.count()).select_from(Subscription)

        if customer_id is not None:
            base_query = base_query.where(Subscription.customer_id == customer_id)
            count_query = count_query.where(Subscription.customer_id == customer_id)

        if status is not None:
            base_query = base_query.where(Subscription.status == status)
            count_query = count_query.where(Subscription.status == status)

        total_res = await self.session.execute(count_query)
        total = total_res.scalar_one()

        stmt = (
            base_query.options(
                selectinload(Subscription.plan),
                selectinload(Subscription.product),
                selectinload(Subscription.billing_schedules),
            )
            .order_by(Subscription.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all()), total

    async def create_subscription(self, subscription: Subscription) -> Subscription:
        self.session.add(subscription)
        await self.session.flush()
        await self.session.refresh(
            subscription, ["plan", "product", "billing_schedules"]
        )
        return subscription

    async def save_subscription(self, subscription: Subscription) -> Subscription:
        self.session.add(subscription)
        await self.session.flush()
        await self.session.refresh(
            subscription, ["plan", "product", "billing_schedules"]
        )
        return subscription

    # --- Billing Schedules ---
    async def create_schedule(self, schedule: BillingSchedule) -> BillingSchedule:
        self.session.add(schedule)
        await self.session.flush()
        await self.session.refresh(schedule)
        return schedule

    async def get_next_pending_schedule(
        self, subscription_id: uuid.UUID
    ) -> Optional[BillingSchedule]:
        stmt = (
            select(BillingSchedule)
            .where(
                BillingSchedule.subscription_id == subscription_id,
                BillingSchedule.status == "pending",
            )
            .order_by(BillingSchedule.invoice_date.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    # --- Credit Notes ---
    async def create_credit_note(self, credit_note: CreditNote) -> CreditNote:
        self.session.add(credit_note)
        await self.session.flush()
        await self.session.refresh(credit_note)
        return credit_note
