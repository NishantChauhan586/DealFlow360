import csv
from datetime import datetime, timedelta, timezone
import io
from typing import List, Optional, Tuple
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import structlog

from app.models.product import ProductCategory
from app.models.quotation import Quotation, QuotationLine, QuotationStatus
from app.schemas.report import SalesReportItem, SalesReportResponse

logger = structlog.get_logger(__name__)


class ReportingService:
    """
    Sales Reporting & Operational Intelligence Service.
    Generates multidimensional sales pipeline analytics and downloadable CSV exports.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def generate_sales_report(
        self,
        period: str = "month",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        sales_rep_id: Optional[uuid.UUID] = None,
        approval_status: Optional[QuotationStatus] = None,
        product_category: Optional[ProductCategory] = None,
    ) -> SalesReportResponse:
        """
        Query quotation database and aggregate sales performance data according to filters.
        """
        now = datetime.now(timezone.utc)

        if period == "today":
            filter_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            filter_end = now
        elif period == "week":
            filter_start = now - timedelta(days=7)
            filter_end = now
        elif period == "month":
            filter_start = now - timedelta(days=30)
            filter_end = now
        elif period == "custom" and start_date:
            filter_start = start_date
            filter_end = end_date or now
        else:
            filter_start = now - timedelta(days=30)
            filter_end = now

        stmt = (
            select(Quotation)
            .options(
                selectinload(Quotation.lines).selectinload(QuotationLine.product)
            )
            .where(
                Quotation.created_at >= filter_start,
                Quotation.created_at <= filter_end,
            )
        )

        if sales_rep_id is not None:
            stmt = stmt.where(Quotation.sales_rep_id == sales_rep_id)

        if approval_status is not None:
            stmt = stmt.where(Quotation.status == approval_status)

        stmt = stmt.order_by(Quotation.created_at.desc())
        result = await self.session.execute(stmt)
        quotes = list(result.scalars().all())

        items: List[SalesReportItem] = []
        total_gross = 0.0
        total_discount = 0.0
        total_net = 0.0

        for q in quotes:
            # Filter by product category if specified
            categories = list({
                l.product.category.value if l.product and hasattr(l.product.category, "value") else str(l.product.category)
                for l in q.lines
                if l.product
            })

            if product_category is not None:
                cat_val = product_category.value if hasattr(product_category, "value") else str(product_category)
                if cat_val not in categories:
                    continue

            gross = sum(l.quantity * l.unit_price for l in q.lines)
            disc = q.discount_total
            net = q.total_amount

            total_gross += gross
            total_discount += disc
            total_net += net

            items.append(
                SalesReportItem(
                    quotation_id=q.id,
                    customer_id=q.customer_id,
                    sales_rep_id=q.sales_rep_id,
                    status=q.status,
                    created_at=q.created_at,
                    total_amount=q.total_amount,
                    discount_total=q.discount_total,
                    blended_risk_score=q.blended_risk_score,
                    line_count=len(q.lines),
                    product_categories=categories,
                )
            )

        avg_discount_pct = (
            round(total_discount / total_gross * 100.0, 2)
            if total_gross > 0
            else 0.0
        )

        return SalesReportResponse(
            period=period,
            total_records=len(items),
            total_gross_amount=round(total_gross, 2),
            total_discount_amount=round(total_discount, 2),
            total_net_amount=round(total_net, 2),
            average_discount_percent=avg_discount_pct,
            records=items,
        )

    def export_sales_report_csv(self, report: SalesReportResponse) -> str:
        """
        Convert sales report dataset into formatted RFC 4180 CSV string.
        """
        output = io.StringIO()
        writer = csv.writer(output)

        # CSV Header
        writer.writerow([
            "Quotation ID",
            "Created Date (UTC)",
            "Customer ID",
            "Sales Rep ID",
            "Status",
            "Line Count",
            "Categories",
            "Discount Total (USD)",
            "Net Total (USD)",
            "Blended Risk Score",
        ])

        # Rows
        for r in report.records:
            writer.writerow([
                str(r.quotation_id),
                r.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                str(r.customer_id),
                str(r.sales_rep_id),
                r.status.value,
                r.line_count,
                ", ".join(r.product_categories),
                f"{r.discount_total:.2f}",
                f"{r.total_amount:.2f}",
                f"{r.blended_risk_score:.2f}" if r.blended_risk_score is not None else "N/A",
            ])

        return output.getvalue()
