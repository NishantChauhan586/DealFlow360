from datetime import datetime, timezone
from typing import Optional
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.core.events import event_bus
from app.models.order import Order, OrderLine, OrderStatus
from app.models.quotation import Quotation, QuotationStatus
from app.repositories.order_repository import OrderRepository
from app.repositories.quotation_repository import QuotationRepository
from app.schemas.approval_request import RiskLevel
from app.schemas.order import OrderLineResponse, OrderResponse
from app.schemas.portal import (
    CustomerQuotationListResponse,
    CustomerQuotationSummary,
    QuotationNegotiationRequest,
    QuotationNegotiationResponse,
)
from app.schemas.quotation import QuotationLineResponse, QuotationResponse
from app.services.approval_engine import ApprovalEngineService
from app.services.billing_service import BillingService
from app.services.quotation_service import compute_line_total, compute_margin
from app.services.risk_score import RiskScoreService
from app.services.warehouse_splitter import WarehouseSplitter

logger = structlog.get_logger(__name__)


class CustomerPortalService:
    """
    Customer Portal domain service governing customer quote review, negotiation,
    deterministic BRS risk re-scoring, approval re-routing, and order confirmation.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.quotation_repo = QuotationRepository(session)
        self.order_repo = OrderRepository(session)
        self.risk_service = RiskScoreService(session)
        self.approval_service = ApprovalEngineService(session)
        self.billing_service = BillingService(session)
        self.warehouse_splitter = WarehouseSplitter(session)

    async def list_customer_quotations(
        self,
        customer_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20,
        status_filter: Optional[QuotationStatus] = None,
    ) -> CustomerQuotationListResponse:
        """
        List quotations belonging strictly to the authenticated customer account.
        """
        skip = (page - 1) * page_size
        quotes, total = await self.quotation_repo.list_quotations(
            skip=skip,
            limit=page_size,
            customer_id=customer_id,
            status=status_filter,
        )

        items = [
            CustomerQuotationSummary(
                id=q.id,
                customer_id=q.customer_id,
                sales_rep_id=q.sales_rep_id,
                status=q.status,
                total_amount=q.total_amount,
                discount_total=q.discount_total,
                blended_risk_score=q.blended_risk_score,
                created_at=q.created_at,
                updated_at=q.updated_at,
                expires_at=q.expires_at,
                line_count=len(q.lines),
            )
            for q in quotes
        ]

        return CustomerQuotationListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
        )

    async def get_customer_quotation_or_404(
        self,
        quotation_id: uuid.UUID,
        customer_id: uuid.UUID,
    ) -> QuotationResponse:
        """
        Fetch customer quotation with strict security check: customer_id must match.
        """
        quotation = await self.quotation_repo.get_by_id(quotation_id)
        if not quotation or quotation.customer_id != customer_id:
            logger.warning(
                "customer_quotation_access_denied_or_not_found",
                quotation_id=str(quotation_id),
                customer_id=str(customer_id),
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quotation '{quotation_id}' was not found for this customer account.",
            )
        return QuotationResponse.model_validate(quotation)

    async def negotiate_quotation(
        self,
        quotation_id: uuid.UUID,
        customer_id: uuid.UUID,
        negotiation_in: QuotationNegotiationRequest,
        customer_tier: str = "gold",
    ) -> QuotationNegotiationResponse:
        """
        Process customer counter-offer negotiation:
        1. Validates customer ownership and allowable quotation state.
        2. Applies line modifications (discounts/quantities).
        3. Recalculates quotation totals.
        4. Re-computes Blended Risk Score (BRS).
        5. If BRS is Medium or High, updates status to 'pending_approval' and routes for approvals.
        6. Dispatches notification event to Sales Representative.
        """
        quotation = await self.quotation_repo.get_by_id(quotation_id)
        if not quotation or quotation.customer_id != customer_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quotation '{quotation_id}' was not found for this customer account.",
            )

        if quotation.status in [QuotationStatus.CONFIRMED, QuotationStatus.CONVERTED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Quotation is already {quotation.status.value} and cannot be negotiated.",
            )

        previous_total = quotation.total_amount
        previous_discount_total = quotation.discount_total

        # Apply itemized line changes
        if negotiation_in.line_changes:
            line_map = {line.id: line for line in quotation.lines}
            for change in negotiation_in.line_changes:
                target_line = line_map.get(change.line_id)
                if not target_line:
                    continue

                if change.new_discount is not None:
                    target_line.discount_percent = change.new_discount

                if change.new_quantity is not None:
                    target_line.quantity = change.new_quantity

                # Recompute line total & margin
                l_tot, _ = compute_line_total(
                    target_line.unit_price,
                    target_line.quantity,
                    target_line.discount_percent,
                )
                target_line.line_total = l_tot
                target_line.margin_percent = compute_margin(
                    target_line.unit_price,
                    target_line.discount_percent,
                )
                self.session.add(target_line)

        # Apply overall uniform discount if specified
        if negotiation_in.overall_discount is not None:
            for line in quotation.lines:
                line.discount_percent = negotiation_in.overall_discount
                l_tot, _ = compute_line_total(
                    line.unit_price,
                    line.quantity,
                    line.discount_percent,
                )
                line.line_total = l_tot
                line.margin_percent = compute_margin(
                    line.unit_price,
                    line.discount_percent,
                )
                self.session.add(line)

        # Recalculate quotation aggregate totals
        subtotal = sum(l.quantity * l.unit_price for l in quotation.lines)
        new_total = sum(l.line_total for l in quotation.lines)
        new_discount_total = max(0.0, subtotal - new_total)

        quotation.total_amount = round(new_total, 2)
        quotation.discount_total = round(new_discount_total, 2)
        quotation.status = QuotationStatus.UNDER_NEGOTIATION

        self.session.add(quotation)
        await self.session.flush()

        # Deterministic BRS Risk Re-calculation
        brs_result = await self.risk_service.calculate_blended_score(
            quotation_id=quotation_id,
            customer_tier=customer_tier,
        )

        requires_approval: bool = False
        governance_action: str = ""
        governance_explanation: str = ""

        risk_name = brs_result.risk_level.value.upper() if hasattr(brs_result.risk_level, "value") else str(brs_result.risk_level).upper()
        brs_score_val = getattr(brs_result, "score", getattr(brs_result, "blended_risk_score", 0.0))

        if str(brs_result.risk_level).upper() in ["MEDIUM", "HIGH"] or brs_result.risk_level in [RiskLevel.MEDIUM, RiskLevel.HIGH]:
            # Higher discount over threshold triggers governance approval workflow
            quotation.status = QuotationStatus.PENDING_APPROVAL
            await self.approval_service.route_for_approval(
                quotation_id=quotation_id,
                customer_tier=customer_tier,
            )
            requires_approval = True
            governance_action = "re_routed_for_approval"
            req_role = getattr(brs_result, "required_approval_role", "Sales Manager")
            governance_explanation = (
                f"Counter-offer exceeded discount thresholds (BRS Score: {brs_score_val:.1f}, "
                f"{risk_name} RISK). "
                f"Quotation has been submitted to {req_role} for review."
            )
        else:
            # Low risk counter-offer auto-approved
            quotation.status = QuotationStatus.APPROVED
            requires_approval = False
            governance_action = "counter_offer_accepted"
            governance_explanation = (
                f"Counter-offer discount is within authorized tier limits (BRS Score: {brs_score_val:.1f}, "
                f"LOW RISK). Quotation approved and ready for order confirmation."
            )

        self.session.add(quotation)
        await self.session.commit()
        await self.session.refresh(quotation)

        # Notify sales rep and log event
        await event_bus.publish(
            "quotation.negotiated",
            {
                "quotation_id": str(quotation_id),
                "customer_id": str(customer_id),
                "previous_total": previous_total,
                "new_total": quotation.total_amount,
                "risk_score": quotation.blended_risk_score,
                "status": quotation.status.value,
                "notes": negotiation_in.counter_offer_notes,
            },
        )

        logger.info(
            "customer_negotiation_processed",
            quotation_id=str(quotation_id),
            customer_id=str(customer_id),
            new_total=quotation.total_amount,
            status=quotation.status.value,
        )

        return QuotationNegotiationResponse(
            quotation_id=quotation_id,
            previous_total=previous_total,
            new_total=quotation.total_amount,
            previous_discount_total=previous_discount_total,
            new_discount_total=quotation.discount_total,
            quotation_status=quotation.status,
            requires_approval=requires_approval,
            governance_action=governance_action,
            governance_explanation=governance_explanation,
            risk_assessment=brs_result,
            updated_quotation=QuotationResponse.model_validate(quotation),
        )

    async def confirm_quotation(
        self,
        quotation_id: uuid.UUID,
        customer_id: uuid.UUID,
    ) -> OrderResponse:
        """
        Confirm quotation and convert into an Order:
        1. Verifies quote status is approved (no pending approval required).
        2. Generates Order and itemized OrderLines.
        3. Updates quotation status to CONFIRMED.
        4. Triggers asynchronous hybrid billing and warehouse allocation.
        """
        quotation = await self.quotation_repo.get_by_id(quotation_id)
        if not quotation or quotation.customer_id != customer_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quotation '{quotation_id}' was not found for this customer account.",
            )

        # Governance validation: must not have pending approval block
        if quotation.status == QuotationStatus.PENDING_APPROVAL:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quotation is pending management approval and cannot be confirmed yet.",
            )
        elif quotation.status == QuotationStatus.REJECTED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quotation has been rejected and cannot be confirmed.",
            )
        elif quotation.status in [QuotationStatus.CONFIRMED, QuotationStatus.CONVERTED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quotation has already been confirmed.",
            )

        # 1. Create Order entity
        now = datetime.now(timezone.utc)
        order_num = f"ORD-{now.strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"

        order = Order(
            id=uuid.uuid4(),
            order_number=order_num,
            quotation_id=quotation.id,
            customer_id=quotation.customer_id,
            sales_rep_id=quotation.sales_rep_id,
            status=OrderStatus.PENDING,
            total_amount=quotation.total_amount,
            currency="USD",
        )
        await self.order_repo.create_order(order)

        # 2. Itemize OrderLines from quotation lines
        for q_line in quotation.lines:
            o_line = OrderLine(
                id=uuid.uuid4(),
                order_id=order.id,
                product_id=q_line.product_id,
                variant_id=q_line.variant_id,
                quantity=q_line.quantity,
                unit_price=q_line.unit_price,
                discount_percent=q_line.discount_percent,
                line_total=q_line.line_total,
                margin_percent=q_line.margin_percent,
            )
            self.session.add(o_line)

        # 3. Update quotation status
        quotation.status = QuotationStatus.CONFIRMED
        self.session.add(quotation)

        await self.session.commit()
        await self.session.refresh(order)

        # 4. Trigger Hybrid Billing (One-time invoice + Subscriptions)
        try:
            await self.billing_service.generate_order_billing(
                order_id=order.id,
                customer_id=order.customer_id,
            )
        except Exception as e:
            logger.error("order_billing_generation_deferred", error=str(e), order_id=str(order.id))

        # 5. Trigger Warehouse Greedy Allocation
        try:
            await self.warehouse_splitter.suggest_split(order_id=order.id)
        except Exception as e:
            logger.error("warehouse_split_deferred", error=str(e), order_id=str(order.id))

        # 6. Dispatch order confirmation event for background processing (Celery / Async workers)
        await event_bus.publish(
            "order.confirmed",
            {
                "order_id": str(order.id),
                "order_number": order.order_number,
                "quotation_id": str(quotation.id),
                "customer_id": str(order.customer_id),
                "total_amount": order.total_amount,
            },
        )

        logger.info(
            "quotation_confirmed_and_order_created",
            quotation_id=str(quotation.id),
            order_id=str(order.id),
            order_number=order.order_number,
        )

        return OrderResponse(
            id=order.id,
            order_number=order.order_number,
            quotation_id=order.quotation_id,
            customer_id=order.customer_id,
            sales_rep_id=order.sales_rep_id,
            status=order.status,
            total_amount=order.total_amount,
            currency=order.currency,
            created_at=order.created_at,
            updated_at=order.updated_at,
            lines=[
                OrderLineResponse(
                    id=l.id,
                    order_id=l.order_id,
                    product_id=l.product_id,
                    product_name=l.product.name if l.product else None,
                    variant_id=l.variant_id,
                    quantity=l.quantity,
                    unit_price=l.unit_price,
                    discount_percent=l.discount_percent,
                    line_total=l.line_total,
                    margin_percent=l.margin_percent,
                )
                for l in order.lines
            ],
        )
