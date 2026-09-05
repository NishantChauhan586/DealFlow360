from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

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

