from datetime import datetime, timedelta, timezone
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.models.product import ProductCategory
from app.models.quotation import QuotationStatus
from app.models.subscription import Invoice, InvoiceStatus
from app.repositories.invoice_repository import InvoiceRepository
from app.repositories.quotation_repository import QuotationRepository
from app.schemas.subscription import (
    CreditNoteResponse,
    InvoiceResponse,
    OrderInvoicesResponse,
)
from app.services.quotation_service import log_audit_event
from app.services.subscription_service import SubscriptionService

logger = structlog.get_logger(__name__)


class BillingService:
    """
    Hybrid Billing Engine generating one-time invoices for capital hardware & services and subscriptions for recurring items.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.quote_repo = QuotationRepository(session)
        self.invoice_repo = InvoiceRepository(session)
        self.sub_service = SubscriptionService(session)

    async def get_order_invoices(
        self, order_id: uuid.UUID
    ) -> OrderInvoicesResponse:
        """
        Retrieve all generated invoices, credit notes, and net payable ledger balance for an order.
        """
        invoices = await self.invoice_repo.list_by_order(order_id)
        credit_notes = await self.invoice_repo.list_credit_notes_by_order(order_id)

        total_invoiced = sum(i.amount for i in invoices)
        total_credited = sum(c.amount for c in credit_notes)
        net_payable = round(max(0.0, total_invoiced - total_credited), 2)

        return OrderInvoicesResponse(
            order_id=order_id,
            invoices=[InvoiceResponse.model_validate(i) for i in invoices],
            credit_notes=[CreditNoteResponse.model_validate(c) for c in credit_notes],
            total_invoiced=round(total_invoiced, 2),
            total_credited=round(total_credited, 2),
            net_payable=net_payable,
        )

    async def process_order_confirmation(
        self, order_id: uuid.UUID
    ) -> OrderInvoicesResponse:
        """
        Execute Hybrid Order Billing Generation:
        1. Separates physical hardware/service lines from recurring SaaS subscriptions.
        2. Emits immediate Invoice for one-time line items.
        3. Spawns active Subscription instances + initial billing schedule invoices for recurring lines.
        4. Transitions quotation/order status to 'confirmed'.
        """
        quote = await self.quote_repo.get_by_id(order_id)
        if not quote:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order/Quotation with ID '{order_id}' was not found.",
            )

        now = datetime.now(timezone.utc)
        one_time_amount = 0.0
        one_time_lines_count = 0
        subscription_lines = []

        for line in quote.lines:
            product = line.product
            if product and product.category == ProductCategory.SUBSCRIPTION:
                subscription_lines.append(line)
            else:
                one_time_amount += line.line_total
                one_time_lines_count += 1

        created_invoices = []

        # 1. Generate one-time invoice for Hardware & Professional Services
        if one_time_amount > 0:
            inv_number = f"INV-HW-{uuid.uuid4().hex[:8].upper()}"
            one_time_inv = Invoice(
                order_id=order_id,
                invoice_number=inv_number,
                amount=round(one_time_amount, 2),
                status=InvoiceStatus.OPEN,
                due_date=now + timedelta(days=30),
                invoice_type="one_time_hardware_and_services",
            )
            saved_inv = await self.invoice_repo.create(one_time_inv)
            created_invoices.append(saved_inv)

        # 2. Instantiate Subscriptions and First Billing Invoices for Recurring Lines
        for sub_line in subscription_lines:
            sub = await self.sub_service.create_subscription_from_line(
                order_id=order_id,
                customer_id=quote.customer_id,
                line=sub_line,
                start_date=now,
            )

            # Generate upfront first-cycle invoice for the subscription
            sub_amount = round(sub_line.line_total, 2)
            sub_inv_number = f"INV-SUB-{uuid.uuid4().hex[:8].upper()}"
            sub_inv = Invoice(
                order_id=order_id,
                invoice_number=sub_inv_number,
                amount=sub_amount,
                status=InvoiceStatus.OPEN,
                due_date=now + timedelta(days=14),
                invoice_type="recurring_subscription",
            )
            saved_sub_inv = await self.invoice_repo.create(sub_inv)
            created_invoices.append(saved_sub_inv)

        # 3. Mark quotation as confirmed
        quote.status = QuotationStatus.CONFIRMED
        await self.quote_repo.save(quote)
        await self.session.commit()

        await log_audit_event(
            action="ORDER_BILLING_PROCESSED",
            entity_type="Quotation",
            entity_id=order_id,
            user_id=quote.sales_rep_id,
            payload={
                "one_time_amount": one_time_amount,
                "subscriptions_count": len(subscription_lines),
                "invoices_created": len(created_invoices),
            },
        )

        logger.info(
            "order_billing_generated",
            order_id=str(order_id),
            one_time_total=one_time_amount,
            subscriptions=len(subscription_lines),
        )

        return await self.get_order_invoices(order_id)
