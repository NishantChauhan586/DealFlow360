from datetime import datetime
from typing import Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from app.models.alert import AlertSeverity, AlertType

base_config = ConfigDict(
    from_attributes=True,
    populate_by_name=True,
    alias_generator=to_camel,
)


class KPIMetrics(BaseModel):
    model_config = base_config

    pipeline_value: float
    active_deals_count: int
    gross_margin_percent: float
    stalled_deals_count: int


class PipelineDealSummary(BaseModel):
    model_config = base_config

    cust: str
    amt: str
    rep: str
    quote_id: Optional[str] = None


class DealAnomalyResponse(BaseModel):
    model_config = base_config

    id: int
    cust: str
    note: str
    level: str
    quote_id: Optional[str] = None


class StalledDealResponse(BaseModel):
    model_config = base_config

    id: int
    cust: str
    amt: str
    days: int
    rep: str


class DashboardOverviewResponse(BaseModel):
    model_config = base_config

    kpis: KPIMetrics
    pipeline: Dict[str, List[PipelineDealSummary]]
    anomalies: List[DealAnomalyResponse]
    stalled_deals: List[StalledDealResponse]


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
