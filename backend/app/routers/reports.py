from datetime import datetime
from typing import Optional, Union
import uuid
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.product import ProductCategory
from app.models.quotation import QuotationStatus
from app.schemas.report import SalesReportResponse
from app.services.reporting_service import ReportingService

router = APIRouter(prefix="/reports", tags=["Reporting & Analytics"])


@router.get(
    "/sales",
    summary="Generate comprehensive sales pipeline report (JSON or downloadable CSV)",
)
async def get_sales_report(
    period: str = Query(
        default="month",
        description="Reporting time horizon: 'today', 'week', 'month', 'custom'",
    ),
    start_date: Optional[datetime] = Query(default=None, description="Custom start date (ISO 8601)"),
    end_date: Optional[datetime] = Query(default=None, description="Custom end date (ISO 8601)"),
    sales_rep_id: Optional[uuid.UUID] = Query(default=None, description="Filter by sales representative UUID"),
    approval_status: Optional[QuotationStatus] = Query(default=None, description="Filter by quotation approval state"),
    product_category: Optional[ProductCategory] = Query(default=None, description="Filter by product category"),
    export_format: str = Query(default="json", description="Output format: 'json' or 'csv'"),
    session: AsyncSession = Depends(get_db),
):
    """
    Generate sales operations report with multidimensional filters.
    When `export_format='csv'`, returns a downloadable CSV attachment.
    """
    service = ReportingService(session)
    report = await service.generate_sales_report(
        period=period,
        start_date=start_date,
        end_date=end_date,
        sales_rep_id=sales_rep_id,
        approval_status=approval_status,
        product_category=product_category,
    )

    if export_format.lower() == "csv":
        csv_content = service.export_sales_report_csv(report)
        filename = f"sales_report_{period}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
            },
        )

    return report
