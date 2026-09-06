import asyncio
from datetime import datetime, timedelta, timezone
import math
from typing import Dict, List, Optional
import uuid
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.core.database import AsyncSessionLocal
from app.models.alert import Alert, AlertSeverity, AlertType
from app.models.order import Order, OrderStatus
from app.models.quotation import Quotation, QuotationLine, QuotationStatus
from app.models.quote import Quote
from app.models.subscription import Invoice, Subscription, SubscriptionContract, SubscriptionStatus
from app.models.warehouse import FulfillmentSplit, FulfillmentSplitStatus
from app.repositories.alert_repository import AlertRepository
from app.schemas.dashboard import (
    AlertListResponse,
    AlertResponse,
    DashboardMetricsResponse,
)

logger = structlog.get_logger(__name__)


class DealHealthService:
    """
    Intelligent Deal Health Monitoring Service.
    Executes automated stall detection, statistical discount anomaly detection,
    delivery promise tracking, and dashboard metric rollups.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.alert_repo = AlertRepository(session)

    async def check_stalled_deals(
        self, stalled_days_threshold: int = 3
    ) -> List[Alert]:
        """
        Identify quotations in active negotiation or sent states with no activity
        for longer than the configured threshold (default 3 days).
        Generates Alert records with severity=MEDIUM.
        """
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=stalled_days_threshold)

        stmt = select(Quotation).where(
            Quotation.status.in_([
                QuotationStatus.SENT_TO_CUSTOMER,
                QuotationStatus.UNDER_NEGOTIATION,
            ]),
            Quotation.updated_at <= cutoff,
        )
        result = await self.session.execute(stmt)
        stalled_quotes = list(result.scalars().all())

        new_alerts: List[Alert] = []

        for quote in stalled_quotes:
            existing = await self.alert_repo.find_existing_unresolved(
                alert_type=AlertType.STALLED,
                quotation_id=quote.id,
            )
            if existing:
                continue

            days_stalled = (now - quote.updated_at).days if quote.updated_at else stalled_days_threshold
            message = (
                f"Quotation '{quote.id}' is stalled in '{quote.status.value}' "
                f"for {days_stalled} days without customer interaction."
            )

            alert = Alert(
                type=AlertType.STALLED,
                severity=AlertSeverity.MEDIUM,
                quotation_id=quote.id,
                message=message,
                details={
                    "stalled_days": days_stalled,
                    "quotation_status": quote.status.value,
                    "total_amount": quote.total_amount,
                    "sales_rep_id": str(quote.sales_rep_id),
                },
            )
            created = await self.alert_repo.create_alert(alert)
            new_alerts.append(created)

            logger.info(
                "stalled_deal_alert_created",
                quotation_id=str(quote.id),
                days_stalled=days_stalled,
                total_amount=quote.total_amount,
            )

        if new_alerts:
            await self.session.commit()

        return new_alerts

    async def check_discount_anomalies(
        self, lookback_days: int = 30
    ) -> List[Alert]:
        """
        Detect statistical discount anomalies:
        1. Calculates mean and standard deviation of line discounts per sales rep over lookback_days.
        2. Identifies new/active quotes where discount > (mean + 2 * stddev).
        3. Generates high-severity anomaly alerts.
        """
        now = datetime.now(timezone.utc)
        lookback_start = now - timedelta(days=lookback_days)

        # 1. Fetch historical quotation lines grouped by sales rep
        stmt = (
            select(
                Quotation.sales_rep_id,
                QuotationLine.discount_percent,
            )
            .join(QuotationLine, Quotation.id == QuotationLine.quotation_id)
            .where(Quotation.created_at >= lookback_start)
        )
        result = await self.session.execute(stmt)
        rows = result.all()

        # Compute rep-specific statistics
        rep_discounts: Dict[uuid.UUID, List[float]] = {}
        for rep_id, disc in rows:
            if disc is not None:
                rep_discounts.setdefault(rep_id, []).append(float(disc))

        rep_stats: Dict[uuid.UUID, Dict[str, float]] = {}
        for rep_id, discounts in rep_discounts.items():
            if len(discounts) >= 3:
                mean = sum(discounts) / len(discounts)
                variance = sum((x - mean) ** 2 for x in discounts) / len(discounts)
                stddev = math.sqrt(variance)
                rep_stats[rep_id] = {
                    "mean": mean,
                    "stddev": stddev,
                    "upper_threshold": round(mean + (2.0 * stddev), 2),
                }

        # 2. Check recent quotations (created in last 48 hours)
        recent_cutoff = now - timedelta(days=2)
        active_stmt = select(Quotation).where(
            Quotation.created_at >= recent_cutoff,
            Quotation.status.in_([
                QuotationStatus.DRAFT,
                QuotationStatus.PENDING_APPROVAL,
                QuotationStatus.UNDER_NEGOTIATION,
                QuotationStatus.SENT_TO_CUSTOMER,
            ]),
        )
        active_res = await self.session.execute(active_stmt)
        active_quotes = list(active_res.scalars().all())

        new_alerts: List[Alert] = []

        for quote in active_quotes:
            stats = rep_stats.get(quote.sales_rep_id)
            if not stats:
                continue

            # Compute effective discount % of quotation
            if quote.lines:
                gross_val = sum(l.quantity * l.unit_price for l in quote.lines)
                eff_disc = (quote.discount_total / gross_val * 100.0) if gross_val > 0 else 0.0
            else:
                eff_disc = 0.0

            if eff_disc > stats["upper_threshold"] and eff_disc > 10.0:
                existing = await self.alert_repo.find_existing_unresolved(
                    alert_type=AlertType.DISCOUNT_ANOMALY,
                    quotation_id=quote.id,
                )
                if existing:
                    continue

                msg = (
                    f"Statistical discount anomaly: Quote discount of {eff_disc:.1f}% "
                    f"exceeds sales rep average ({stats['mean']:.1f}% ± {stats['stddev']:.1f}%) "
                    f"by >2 standard deviations (threshold: {stats['upper_threshold']:.1f}%)."
                )

                alert = Alert(
                    type=AlertType.DISCOUNT_ANOMALY,
                    severity=AlertSeverity.HIGH,
                    quotation_id=quote.id,
                    message=msg,
                    details={
                        "sales_rep_id": str(quote.sales_rep_id),
                        "quotation_discount_percent": round(eff_disc, 2),
                        "rep_mean_discount": round(stats["mean"], 2),
                        "rep_stddev": round(stats["stddev"], 2),
                        "upper_threshold": stats["upper_threshold"],
                    },
                )
                created = await self.alert_repo.create_alert(alert)
                new_alerts.append(created)

                logger.warning(
                    "discount_anomaly_alert_created",
                    quotation_id=str(quote.id),
                    rep_id=str(quote.sales_rep_id),
                    discount=eff_disc,
                    threshold=stats["upper_threshold"],
                )

        if new_alerts:
            await self.session.commit()

        return new_alerts

    async def check_delivery_slippage(self) -> List[Alert]:
        """
        Placeholder delivery promise check:
        Identifies orders with backordered splits aging > 2 days.
        """
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=2)

        stmt = select(FulfillmentSplit).where(
            FulfillmentSplit.status == FulfillmentSplitStatus.BACKORDERED,
            FulfillmentSplit.created_at <= cutoff,
        )
        result = await self.session.execute(stmt)
        backordered_splits = list(result.scalars().all())

        new_alerts: List[Alert] = []
        for split in backordered_splits:
            msg = f"Delivery risk: Order '{split.order_id}' has backordered inventory waiting >48 hours."
            alert = Alert(
                type=AlertType.DELIVERY_PROMISE,
                severity=AlertSeverity.MEDIUM,
                order_id=split.order_id,
                message=msg,
                details={
                    "split_id": str(split.id),
                    "product_id": str(split.product_id),
                    "allocated_quantity": split.allocated_quantity,
                },
            )
            created = await self.alert_repo.create_alert(alert)
            new_alerts.append(created)

        if new_alerts:
            await self.session.commit()

        return new_alerts

    async def list_alerts(
        self,
        page: int = 1,
        page_size: int = 50,
        unresolved_only: bool = True,
        alert_type: Optional[AlertType] = None,
        severity: Optional[AlertSeverity] = None,
    ) -> AlertListResponse:
        """
        List paginated health alerts.
        """
        skip = (page - 1) * page_size
        alerts, total = await self.alert_repo.list_alerts(
            skip=skip,
            limit=page_size,
            unresolved_only=unresolved_only,
            alert_type=alert_type,
            severity=severity,
        )
        return AlertListResponse(
            items=[AlertResponse.model_validate(a) for a in alerts],
            total=total,
            page=page,
            page_size=page_size,
        )

    async def resolve_alert(
        self,
        alert_id: uuid.UUID,
        resolved_by: Optional[uuid.UUID] = None,
    ) -> AlertResponse:
        """
        Mark a deal health alert as resolved.
        """
        alert = await self.alert_repo.get_by_id(alert_id)
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Alert with ID '{alert_id}' was not found.",
            )

        resolved = await self.alert_repo.resolve_alert(alert, resolved_by=resolved_by)
        await self.session.commit()
        return AlertResponse.model_validate(resolved)

    async def get_dashboard_metrics(self) -> DashboardMetricsResponse:
        """
        Aggregate executive operational metrics for DealFlow360 platform dashboard.
        """
        # Quotation metrics (Check Quotation model first, fallback to Quote model)
        total_quotes_res = await self.session.execute(select(func.count()).select_from(Quotation))
        total_quotes = total_quotes_res.scalar_one()
        if total_quotes == 0:
            quote_count_res = await self.session.execute(select(func.count()).select_from(Quote))
            total_quotes = quote_count_res.scalar_one()

        pending_approvals_res = await self.session.execute(
            select(func.count()).select_from(Quotation).where(Quotation.status == QuotationStatus.PENDING_APPROVAL)
        )
        pending_approvals = pending_approvals_res.scalar_one()
        if pending_approvals == 0:
            pending_q_res = await self.session.execute(
                select(func.count()).select_from(Quote).where(Quote.status.ilike("%Pending%"))
            )
            pending_approvals = pending_q_res.scalar_one()

        pipeline_val_res = await self.session.execute(select(func.coalesce(func.sum(Quotation.total_amount), 0.0)))
        total_pipeline_value = pipeline_val_res.scalar_one()
        if total_pipeline_value == 0.0:
            quote_val_res = await self.session.execute(select(func.coalesce(func.sum(Quote.grand_total), 0.0)))
            total_pipeline_value = quote_val_res.scalar_one()
        total_pipeline_value = round(total_pipeline_value, 2)

        # Alert metrics
        stalled_deals = await self.alert_repo.count_unresolved_by_type(AlertType.STALLED)
        high_anomalies = await self.alert_repo.count_unresolved_by_severity(AlertSeverity.HIGH)

        # Order metrics
        total_orders_res = await self.session.execute(select(func.count()).select_from(Order))
        total_orders = total_orders_res.scalar_one()

        # Subscription metrics
        subs_res = await self.session.execute(
            select(func.count()).select_from(Subscription).where(Subscription.status == SubscriptionStatus.ACTIVE)
        )
        active_subscriptions = subs_res.scalar_one()
        if active_subscriptions == 0:
            contract_subs_res = await self.session.execute(
                select(func.count()).select_from(SubscriptionContract).where(SubscriptionContract.status.ilike("Active"))
            )
            active_subscriptions = contract_subs_res.scalar_one()

        # Invoiced revenue / order revenue
        inv_res = await self.session.execute(select(func.coalesce(func.sum(Invoice.amount), 0.0)))
        total_invoiced_revenue = inv_res.scalar_one()
        if total_invoiced_revenue == 0.0:
            order_rev_res = await self.session.execute(select(func.coalesce(func.sum(Order.total_amount), 0.0)))
            total_invoiced_revenue = order_rev_res.scalar_one()
        total_invoiced_revenue = round(total_invoiced_revenue, 2)

        return DashboardMetricsResponse(
            total_quotes=total_quotes,
            pending_approvals=pending_approvals,
            stalled_deals=stalled_deals,
            high_anomalies=high_anomalies,
            total_orders=total_orders,
            active_subscriptions=active_subscriptions,
            total_pipeline_value=total_pipeline_value,
            total_invoiced_revenue=total_invoiced_revenue,
        )
