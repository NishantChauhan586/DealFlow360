from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field

from app.models.alert import AlertSeverity, AlertType


class AlertResponse(BaseModel):
    id: uuid.UUID
    type: AlertType
    severity: AlertSeverity
    quotation_id: Optional[uuid.UUID] = None
    order_id: Optional[uuid.UUID] = None
    message: str
    details: dict = Field(default_factory=dict)
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[uuid.UUID] = None

    model_config = ConfigDict(from_attributes=True)


class AlertListResponse(BaseModel):
    items: List[AlertResponse]
    total: int
    page: int
    page_size: int


class AlertResolveRequest(BaseModel):
    resolution_notes: Optional[str] = Field(None, max_length=500, description="Audit notes explaining alert resolution")


class DashboardMetricsResponse(BaseModel):
    total_quotes: int
    pending_approvals: int
    stalled_deals: int
    high_anomalies: int
    total_orders: int
    active_subscriptions: int
    total_pipeline_value: float
    total_invoiced_revenue: float
