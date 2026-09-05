from typing import Optional
import uuid
from fastapi import APIRouter, Depends, Header, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.alert import AlertSeverity, AlertType
from app.schemas.dashboard import (
    AlertListResponse,
    AlertResolveRequest,
    AlertResponse,
    DashboardMetricsResponse,
)
from app.services.deal_health_service import DealHealthService

router = APIRouter(prefix="/dashboard", tags=["Deal Health & Dashboard Operations"])


def get_current_user_id(
    x_user_id: Optional[str] = Header(default=None, description="Authenticated user UUID"),
) -> Optional[uuid.UUID]:
    if x_user_id:
        try:
            return uuid.UUID(x_user_id)
        except ValueError:
            pass
    return None


@router.get(
    "/alerts",
    response_model=AlertListResponse,
    summary="List deal health alerts (stalled deals, discount anomalies, delivery risks)",
)
async def list_health_alerts(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=50, ge=1, le=100, description="Items per page"),
    unresolved_only: bool = Query(default=True, description="Filter for unresolved alerts"),
    alert_type: Optional[AlertType] = Query(default=None, description="Filter by alert type"),
    severity: Optional[AlertSeverity] = Query(default=None, description="Filter by severity level"),
    session: AsyncSession = Depends(get_db),
) -> AlertListResponse:
    """
    Retrieve real-time deal health and risk alerts with status and severity filters.
    """
    service = DealHealthService(session)
    return await service.list_alerts(
        page=page,
        page_size=page_size,
        unresolved_only=unresolved_only,
        alert_type=alert_type,
        severity=severity,
    )


@router.post(
    "/alerts/{alert_id}/resolve",
    response_model=AlertResponse,
    summary="Acknowledge and mark a deal health alert as resolved",
)
async def resolve_health_alert(
    alert_id: uuid.UUID,
    resolve_in: Optional[AlertResolveRequest] = None,
    current_user_id: Optional[uuid.UUID] = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
) -> AlertResponse:
    """
    Mark an active deal health alert as resolved with audit timestamp and user attribution.
    """
    service = DealHealthService(session)
    return await service.resolve_alert(
        alert_id=alert_id,
        resolved_by=current_user_id,
    )


@router.get(
    "/metrics",
    response_model=DashboardMetricsResponse,
    summary="Get executive dashboard operational metrics and counts",
)
async def get_dashboard_metrics(
    session: AsyncSession = Depends(get_db),
) -> DashboardMetricsResponse:
    """
    Retrieve live operational metrics: total quotes, pending approvals,
    stalled deals, discount anomalies, orders, subscriptions, and revenue.
    """
    service = DealHealthService(session)
    return await service.get_dashboard_metrics()
