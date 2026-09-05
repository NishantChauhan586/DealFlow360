import math
from typing import Any, Dict, Optional, Tuple
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.models.quotation import Quotation, QuotationLine, QuotationStatus
from app.repositories.product_repository import ProductRepository
from app.repositories.quotation_line_repository import QuotationLineRepository
from app.repositories.quotation_repository import QuotationRepository
from app.repositories.variant_repository import VariantRepository
from app.schemas.quotation import (
    QuotationCreate,
    QuotationLineCreate,
    QuotationLineUpdate,
    QuotationListResponse,
    QuotationResponse,
    QuotationUpdate,
)
from app.services.pricing_service import PricingService

logger = structlog.get_logger(__name__)


# ------------------------------------------------------------------------------
# Mathematical & Pricing Calculation Helpers
# ------------------------------------------------------------------------------

def compute_line_total(
    unit_price: float, quantity: int, discount_percent: float
) -> Tuple[float, float]:
    """
    Compute line item gross, discount reduction, and net total.
    Returns (line_total, discount_amount).
    """
    gross = float(unit_price) * int(quantity)
    discount_amt = gross * (float(discount_percent) / 100.0)
    line_total = round(gross - discount_amt, 2)
    discount_amount = round(discount_amt, 2)
    return line_total, discount_amount


def compute_margin(
    unit_price: float, discount_percent: float, cost_price: Optional[float] = None
) -> float:
    """
    Calculate effective margin percentage based on net selling price and underlying cost.
    If cost_price is omitted, uses an estimated baseline cost of 50% unit price.
    """
    effective_unit_price = unit_price * (1.0 - (discount_percent / 100.0))
    if effective_unit_price <= 0:
        return 0.0

    cost = cost_price if cost_price is not None else (unit_price * 0.50)
    margin = ((effective_unit_price - cost) / effective_unit_price) * 100.0
    return round(margin, 2)


from app.models.audit_log import AuditLog


async def log_audit_event(
    action: str,
    entity_type: str,
    entity_id: uuid.UUID,
    payload: Dict[str, Any],
    user_id: Optional[uuid.UUID] = None,
    session: Optional[AsyncSession] = None,
    reason: Optional[str] = None,
) -> None:
    """
    Central audit logger: logs structured info and writes an immutable record to the audit_logs table.
    """
    logger.info(
        "audit_event_logged",
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        user_id=str(user_id) if user_id else "system",
        payload=payload,
    )
    if session:
        try:
            log_entry = AuditLog(
                entity_type=entity_type,
                entity_id=entity_id,
                action=action,
                old_value=payload.get("old_value", {}),
                new_value=payload.get("new_value", payload),
                user_id=user_id,
                reason=reason or payload.get("reason"),
            )
            session.add(log_entry)
            await session.flush()
        except Exception as e:
            logger.warning("audit_log_persist_failed", error=str(e))


# ------------------------------------------------------------------------------
# Quotation Business Service
# ------------------------------------------------------------------------------

class QuotationService:
    """
    Business service layer managing the core Quotation lifecycle, line items, and totals calculations.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.quote_repo = QuotationRepository(session)
        self.line_repo = QuotationLineRepository(session)
        self.product_repo = ProductRepository(session)
        self.variant_repo = VariantRepository(session)
        self.pricing_service = PricingService(session)

    def _validate_editable(self, quotation: Quotation) -> None:
        """
        Governance Rule: A quote can strictly only be modified when its status is 'draft'.
        """
        if quotation.status != QuotationStatus.DRAFT:
            logger.warning(
                "quotation_edit_blocked_non_draft",
                quotation_id=str(quotation.id),
                status=quotation.status.value,
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Quotation '{quotation.id}' cannot be modified because its current status is "
                    f"'{quotation.status.value}'. Only 'draft' quotations can be edited."
                ),
            )

    def _recalculate_totals(self, quotation: Quotation) -> None:
        """
        Recalculate and update the header total_amount and discount_total from all line items.
        """
        total = 0.0
        discount_sum = 0.0

        for line in quotation.lines:
            gross = line.unit_price * line.quantity
            line_total = line.line_total
            total += line_total
            discount_sum += (gross - line_total)

        quotation.total_amount = round(total, 2)
        quotation.discount_total = round(discount_sum, 2)

    async def get_quotation_or_404(self, quotation_id: uuid.UUID) -> Quotation:
        """
        Fetch a quotation by ID or raise 404 HTTPException.
        """
        quote = await self.quote_repo.get_by_id(quotation_id)
        if not quote:
            logger.warning("quotation_not_found", quotation_id=str(quotation_id))
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quotation with ID '{quotation_id}' was not found.",
            )
        return quote

    async def list_quotations(
        self,
        page: int = 1,
        page_size: int = 20,
        status_filter: Optional[QuotationStatus] = None,
        sales_rep_id: Optional[uuid.UUID] = None,
        customer_id: Optional[uuid.UUID] = None,
    ) -> QuotationListResponse:
        """
        List paginated quotations with lifecycle and ownership filters.
        """
        if page < 1:
            page = 1
        if page_size < 1 or page_size > 100:
            page_size = 20

        skip = (page - 1) * page_size
        items, total = await self.quote_repo.list_quotations(
            skip=skip,
            limit=page_size,
            status=status_filter,
            sales_rep_id=sales_rep_id,
            customer_id=customer_id,
        )

        total_pages = math.ceil(total / page_size) if total > 0 else 1

        return QuotationListResponse(
            items=[QuotationResponse.model_validate(q) for q in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    async def create_draft(
        self,
        quotation_in: QuotationCreate,
        current_user_id: uuid.UUID,
    ) -> Quotation:
        """
        Create a new draft quotation and optional initial line items.
        """
        sales_rep_id = quotation_in.sales_rep_id or current_user_id

        quote = await self.quote_repo.create(quotation_in, sales_rep_id=sales_rep_id)

        # Process any initial lines provided in the payload
        for line_in in quotation_in.lines:
            await self._add_line_internal(quote, line_in)

        self._recalculate_totals(quote)
        await self.quote_repo.save(quote)
        await self.session.commit()

        await log_audit_event(
            action="QUOTATION_CREATED",
            entity_type="Quotation",
            entity_id=quote.id,
            user_id=sales_rep_id,
            payload={
                "customer_id": str(quote.customer_id),
                "total_amount": quote.total_amount,
                "lines_count": len(quote.lines),
            },
        )

        # Reload with relations
        return await self.get_quotation_or_404(quote.id)

    async def update_quotation(
        self, quotation_id: uuid.UUID, quotation_in: QuotationUpdate
    ) -> Quotation:
        """
        Update header attributes of an existing draft quotation.
        """
        quote = await self.get_quotation_or_404(quotation_id)
        self._validate_editable(quote)

        updated = await self.quote_repo.update(quote, quotation_in)
        await self.session.commit()

        await log_audit_event(
            action="QUOTATION_HEADER_UPDATED",
            entity_type="Quotation",
            entity_id=quote.id,
            user_id=quote.sales_rep_id,
            payload=quotation_in.model_dump(exclude_unset=True),
        )
        return updated

    async def add_line(
        self, quotation_id: uuid.UUID, line_in: QuotationLineCreate
    ) -> Quotation:
        """
        Add a line item to a draft quotation and recalculate totals.
        """
        quote = await self.get_quotation_or_404(quotation_id)
        self._validate_editable(quote)

        await self._add_line_internal(quote, line_in)
        self._recalculate_totals(quote)
        await self.quote_repo.save(quote)
        await self.session.commit()

        await log_audit_event(
            action="QUOTATION_LINE_ADDED",
            entity_type="Quotation",
            entity_id=quote.id,
            user_id=quote.sales_rep_id,
            payload={
                "product_id": str(line_in.product_id),
                "quantity": line_in.quantity,
                "discount_percent": line_in.discount_percent,
                "new_total": quote.total_amount,
            },
        )
        return await self.get_quotation_or_404(quote.id)

    async def _add_line_internal(
        self, quote: Quotation, line_in: QuotationLineCreate
    ) -> QuotationLine:
        """
        Internal worker to validate product/variant, resolve price if needed, calculate totals and append line.
        """
        product = await self.product_repo.get_by_id(line_in.product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID '{line_in.product_id}' was not found.",
            )

        if not product.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot add inactive product '{product.name}' to a quote.",
            )

        extra_price = 0.0
        if line_in.variant_id:
            variant = await self.variant_repo.get_by_id(line_in.variant_id)
            if not variant or variant.product_id != product.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Variant ID '{line_in.variant_id}' does not belong to product '{product.name}'.",
                )
            extra_price = variant.extra_price

        # If unit price was not explicitly specified, calculate via pricing service
        if line_in.unit_price is not None:
            unit_price = line_in.unit_price
        else:
            try:
                price_res = await self.pricing_service.calculate_price(
                    product_id=product.id,
                    customer_tier=None,
                )
                unit_price = price_res.base_price + extra_price
            except Exception:
                unit_price = extra_price if extra_price > 0 else 0.0

        line_total, _ = compute_line_total(
            unit_price=unit_price,
            quantity=line_in.quantity,
            discount_percent=line_in.discount_percent,
        )
        margin_percent = compute_margin(
            unit_price=unit_price,
            discount_percent=line_in.discount_percent,
        )

        db_line = QuotationLine(
            quotation_id=quote.id,
            product_id=product.id,
            variant_id=line_in.variant_id,
            quantity=line_in.quantity,
            unit_price=unit_price,
            discount_percent=line_in.discount_percent,
            line_total=line_total,
            margin_percent=margin_percent,
        )
        quote.lines.append(db_line)
        return db_line

    async def update_line(
        self,
        quotation_id: uuid.UUID,
        line_id: uuid.UUID,
        line_in: QuotationLineUpdate,
    ) -> Quotation:
        """
        Update quantity, unit price, or discount on a quotation line item.
        """
        quote = await self.get_quotation_or_404(quotation_id)
        self._validate_editable(quote)

        target_line = None
        for line in quote.lines:
            if line.id == line_id:
                target_line = line
                break

        if not target_line:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Line item '{line_id}' was not found in quotation '{quotation_id}'.",
            )

        new_qty = line_in.quantity if line_in.quantity is not None else target_line.quantity
        new_unit_price = (
            line_in.unit_price if line_in.unit_price is not None else target_line.unit_price
        )
        new_discount = (
            line_in.discount_percent
            if line_in.discount_percent is not None
            else target_line.discount_percent
        )

        line_total, _ = compute_line_total(
            unit_price=new_unit_price,
            quantity=new_qty,
            discount_percent=new_discount,
        )
        margin_percent = compute_margin(
            unit_price=new_unit_price,
            discount_percent=new_discount,
        )

        updates = {
            "quantity": new_qty,
            "unit_price": new_unit_price,
            "discount_percent": new_discount,
            "line_total": line_total,
            "margin_percent": margin_percent,
        }
        await self.line_repo.update(target_line, updates)

        self._recalculate_totals(quote)
        await self.quote_repo.save(quote)
        await self.session.commit()

        await log_audit_event(
            action="QUOTATION_LINE_UPDATED",
            entity_type="Quotation",
            entity_id=quote.id,
            user_id=quote.sales_rep_id,
            payload={"line_id": str(line_id), "updates": updates},
        )
        return await self.get_quotation_or_404(quote.id)

    async def delete_line(
        self, quotation_id: uuid.UUID, line_id: uuid.UUID
    ) -> Quotation:
        """
        Remove a line item from a draft quotation and recalculate totals.
        """
        quote = await self.get_quotation_or_404(quotation_id)
        self._validate_editable(quote)

        target_line = None
        for line in quote.lines:
            if line.id == line_id:
                target_line = line
                break

        if not target_line:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Line item '{line_id}' was not found in quotation '{quotation_id}'.",
            )

        quote.lines.remove(target_line)
        await self.line_repo.delete(target_line)

        self._recalculate_totals(quote)
        await self.quote_repo.save(quote)
        await self.session.commit()

        await log_audit_event(
            action="QUOTATION_LINE_DELETED",
            entity_type="Quotation",
            entity_id=quote.id,
            user_id=quote.sales_rep_id,
            payload={"deleted_line_id": str(line_id), "new_total": quote.total_amount},
        )
        return await self.get_quotation_or_404(quote.id)
