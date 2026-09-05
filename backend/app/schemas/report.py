from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, Field

from app.models.product import ProductCategory
from app.models.quotation import QuotationStatus


class SalesReportItem(BaseModel):
    quotation_id: uuid.UUID
    customer_id: uuid.UUID
    sales_rep_id: uuid.UUID
    status: QuotationStatus
    created_at: datetime
    total_amount: float
    discount_total: float
    blended_risk_score: Optional[float] = None
    line_count: int
    product_categories: List[str]


class SalesReportResponse(BaseModel):
    period: str
    total_records: int
    total_gross_amount: float
    total_discount_amount: float
    total_net_amount: float
    average_discount_percent: float
    records: List[SalesReportItem]
