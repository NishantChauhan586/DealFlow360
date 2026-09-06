import asyncio
import structlog

from app.core.database import AsyncSessionLocal
from app.services.deal_health_service import DealHealthService
from app.tasks.celery_app import celery_app

logger = structlog.get_logger(__name__)


@celery_app.task(name="app.tasks.health_checks.check_stalled_deals")
def check_stalled_deals(stalled_days_threshold: int = 3) -> dict:
    """
    Celery Beat task: Detect stalled sales quotations aging past threshold days.
    """
    async def _runner():
        async with AsyncSessionLocal() as session:
            service = DealHealthService(session)
            alerts = await service.check_stalled_deals(stalled_days_threshold=stalled_days_threshold)
            return len(alerts)

    try:
        count = asyncio.run(_runner())
        logger.info("celery_check_stalled_deals_completed", new_alerts=count)
        return {"status": "success", "new_stalled_alerts": count}
    except Exception as e:
        logger.error("celery_check_stalled_deals_failed", error=str(e))
        return {"status": "error", "message": str(e)}


@celery_app.task(name="app.tasks.health_checks.check_discount_anomalies")
def check_discount_anomalies(lookback_days: int = 30) -> dict:
    """
    Celery Beat task: Compute statistical discount averages per rep and flag anomalies (> 2 stddev).
    """
    async def _runner():
        async with AsyncSessionLocal() as session:
            service = DealHealthService(session)
            alerts = await service.check_discount_anomalies(lookback_days=lookback_days)
            return len(alerts)

    try:
        count = asyncio.run(_runner())
        logger.info("celery_check_discount_anomalies_completed", new_alerts=count)
        return {"status": "success", "new_anomaly_alerts": count}
    except Exception as e:
        logger.error("celery_check_discount_anomalies_failed", error=str(e))
        return {"status": "error", "message": str(e)}


@celery_app.task(name="app.tasks.health_checks.check_delivery_slippage")
def check_delivery_slippage() -> dict:
    """
    Celery Beat task: Track fulfillment delivery SLA slippage and unresolved backorders.
    """
    async def _runner():
        async with AsyncSessionLocal() as session:
            service = DealHealthService(session)
            alerts = await service.check_delivery_slippage()
            return len(alerts)

    try:
        count = asyncio.run(_runner())
        logger.info("celery_check_delivery_slippage_completed", new_alerts=count)
        return {"status": "success", "new_delivery_alerts": count}
    except Exception as e:
        logger.error("celery_check_delivery_slippage_failed", error=str(e))
        return {"status": "error", "message": str(e)}
