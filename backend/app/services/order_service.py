from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.core.events import event_bus
from app.models.order import Order, OrderLine, OrderStatus
from app.models.product import ProductCategory
from app.models.quotation import Quotation, QuotationStatus
from app.models.subscription import (
    BillingSchedule,
    BillingScheduleStatus,
    Invoice,
    InvoiceStatus,
    Subscription,
    SubscriptionInterval,
    SubscriptionPlan,
    SubscriptionStatus,
)
from app.models.warehouse import FulfillmentSplit, FulfillmentSplitStatus
from app.repositories.fulfillment_split_repository import FulfillmentSplitRepository
from app.repositories.invoice_repository import InvoiceRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.quotation_repository import QuotationRepository
from app.repositories.subscription_repository import SubscriptionRepository
from app.schemas.order import (
    OrderDetailResponse,
    OrderFulfillmentProcessResponse,
    OrderLineResponse,
    OrderListResponse,
    OrderResponse,
)
from app.schemas.subscription import InvoiceResponse, SubscriptionResponse
from app.schemas.warehouse import FulfillmentSplitResponse
from app.services.subscription_service import SubscriptionService
from app.services.warehouse_splitter import WarehouseSplitter
from app.tasks.fulfillment_tasks import process_fulfillment

logger = structlog.get_logger(__name__)


class OrderService:
    """
    End-to-end Order Lifecycle and Orchestration Service.
    Connects Orders to Warehouse Inventory Allocation and Hybrid Billing.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.order_repo = OrderRepository(session)
        self.quotation_repo = QuotationRepository(session)
        self.split_repo = FulfillmentSplitRepository(session)
        self.invoice_repo = InvoiceRepository(session)
        self.sub_repo = SubscriptionRepository(session)
        self.warehouse_splitter = WarehouseSplitter(session)
        self.subscription_service = SubscriptionService(session)

    async def create_order_from_quotation(
        self, quotation_id: uuid.UUID
    ) -> OrderDetailResponse:
        """
        Convert an approved quotation into an official Order:
        1. Validates quotation state (must not be pending approval or already confirmed).
        2. Instantiates Order entity with status='pending'.
        3. Copies quotation lines into OrderLine records.
        4. Calls WarehouseSplitter to generate greedy FulfillmentSplit allocations.
        5. For each line:
           - Hardware & Service lines -> Generates one-time Invoice with status='pending'.
           - Subscription lines -> Creates recurring Subscription contract + initial BillingSchedule.
        6. Updates quotation status to CONFIRMED.
        7. Enqueues asynchronous Celery fulfillment background processing task.
        """
        quotation = await self.quotation_repo.get_by_id(quotation_id)
        if not quotation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quotation '{quotation_id}' was not found.",
            )

        if quotation.status == QuotationStatus.PENDING_APPROVAL:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot convert quotation to Order: Management approval is still pending.",
            )
        elif quotation.status == QuotationStatus.REJECTED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot convert quotation to Order: Quotation was rejected.",
            )
        elif quotation.status in (QuotationStatus.CONFIRMED, QuotationStatus.CONVERTED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Quotation is already {quotation.status.value}.",
            )

        now = datetime.now(timezone.utc)
        order_number = f"ORD-{now.strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"

        # 1. Create Order
        order = Order(
            order_number=order_number,
            quotation_id=quotation.id,
            customer_id=quotation.customer_id,
            sales_rep_id=quotation.sales_rep_id,
            status=OrderStatus.PENDING,
            total_amount=quotation.total_amount,
            currency="USD",
        )
        await self.order_repo.create_order(order)

        # 2. Copy itemized lines
        for q_line in quotation.lines:
            o_line = OrderLine(
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

        await self.session.flush()

        # 3. Call WarehouseSplitter for greedy fulfillment allocation
        fulfillment_plan = await self.warehouse_splitter.suggest_split(order_id=order.id)

        # 4. Generate Invoices & Subscriptions per line
        for q_line in quotation.lines:
            product = q_line.product
            category = product.category if product else ProductCategory.HARDWARE

            if category in (ProductCategory.HARDWARE, ProductCategory.SERVICE):
                # Upfront invoice for one-time capital lines
                inv_number = f"INV-{now.strftime('%Y%m')}-{str(uuid.uuid4())[:6].upper()}"
                invoice = Invoice(
                    order_id=order.id,
                    invoice_number=inv_number,
                    amount=q_line.line_total,
                    status=InvoiceStatus.PENDING,
                    due_date=now + timedelta(days=30),
                )
                await self.invoice_repo.create_invoice(invoice)
            elif category == ProductCategory.SUBSCRIPTION:
                # Recurring subscription contract + billing schedule
                await self.subscription_service.create_subscription_from_order_line(
                    order_id=order.id,
                    customer_id=order.customer_id,
                    line=q_line,
                    start_date=now,
                )

        # 5. Mark quotation as CONFIRMED
        quotation.status = QuotationStatus.CONFIRMED
        self.session.add(quotation)

        await self.session.commit()
        await self.session.refresh(order)

        # 6. Trigger async background task (Celery Stub)
        try:
            process_fulfillment(str(order.id))
        except Exception as e:
            logger.warning("celery_dispatch_deferred", error=str(e), order_id=str(order.id))

        # 7. Publish order confirmation event
        await event_bus.publish(
            "order.created",
            {
                "order_id": str(order.id),
                "order_number": order.order_number,
                "quotation_id": str(quotation.id),
                "customer_id": str(order.customer_id),
                "total_amount": order.total_amount,
            },
        )

        logger.info(
            "order_created_and_connected_to_fulfillment_and_billing",
            order_id=str(order.id),
            order_number=order.order_number,
            quotation_id=str(quotation.id),
        )

        return await self.get_order_detail(order.id)

    async def get_order_detail(self, order_id: uuid.UUID) -> OrderDetailResponse:
        """
        Retrieve complete order graph including itemized lines, fulfillment splits,
        invoices, and active subscriptions.
        """
        order = await self.order_repo.get_by_id(order_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order with ID '{order_id}' was not found.",
            )

        # Fetch fulfillment splits
        splits = await self.split_repo.get_splits_by_order(order_id)

        # Fetch invoices
        invoices = await self.invoice_repo.get_invoices_by_order(order_id)

        # Fetch subscriptions
        subscriptions = await self.sub_repo.get_subscriptions_by_order(order_id)

        return OrderDetailResponse(
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
            fulfillment_splits=[FulfillmentSplitResponse.model_validate(s) for s in splits],
            invoices=[InvoiceResponse.model_validate(i) for i in invoices],
            subscriptions=[SubscriptionResponse.model_validate(s) for s in subscriptions],
        )

    async def process_order_fulfillment(
        self, order_id: uuid.UUID
    ) -> OrderFulfillmentProcessResponse:
        """
        Execute fulfillment state transition:
        - When inventory is available, updates FulfillmentSplit.status = 'fulfilled'.
        - If backordered, keeps status = 'backordered' and logs inventory shortage message.
        - Updates Order status to 'fulfilled' if all splits fulfilled, or 'processing' if backorders exist.
        """
        order = await self.order_repo.get_by_id(order_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order with ID '{order_id}' was not found.",
            )

        splits = await self.split_repo.get_splits_by_order(order_id)
        if not splits:
            # Generate splits if none exist yet
            await self.warehouse_splitter.suggest_split(order_id)
            splits = await self.split_repo.get_splits_by_order(order_id)

        fulfilled_count = 0
        backordered_count = 0

        for split in splits:
            if split.status == FulfillmentSplitStatus.PENDING:
                # Digital fulfillment or physical allocated items
                split.status = FulfillmentSplitStatus.FULFILLED
                self.session.add(split)
                fulfilled_count += 1
                logger.info(
                    "fulfillment_split_fulfilled",
                    split_id=str(split.id),
                    order_id=str(order_id),
                    qty=split.allocated_quantity,
                )
            elif split.status == FulfillmentSplitStatus.BACKORDERED:
                backordered_count += 1
                logger.warning(
                    "fulfillment_split_backordered_awaiting_restock",
                    split_id=str(split.id),
                    order_id=str(order_id),
                    product_id=str(split.product_id),
                )
            elif split.status == FulfillmentSplitStatus.FULFILLED:
                fulfilled_count += 1

        # Update overall order status
        if backordered_count > 0:
            order.status = OrderStatus.PROCESSING
        elif fulfilled_count == len(splits) and len(splits) > 0:
            order.status = OrderStatus.FULFILLED

        self.session.add(order)
        await self.session.commit()

        updated_splits = await self.split_repo.get_splits_by_order(order_id)

        return OrderFulfillmentProcessResponse(
            order_id=order.id,
            order_status=order.status,
            splits_fulfilled=fulfilled_count,
            splits_backordered=backordered_count,
            total_splits=len(updated_splits),
            details=[FulfillmentSplitResponse.model_validate(s) for s in updated_splits],
        )

    async def list_orders(
        self,
        page: int = 1,
        page_size: int = 20,
        customer_id: Optional[uuid.UUID] = None,
        status_filter: Optional[OrderStatus] = None,
    ) -> OrderListResponse:
        """
        List paginated orders.
        """
        skip = (page - 1) * page_size
        orders, total = await self.order_repo.list_orders(
            skip=skip,
            limit=page_size,
            customer_id=customer_id,
            status=status_filter,
        )

        return OrderListResponse(
            items=[
                OrderResponse(
                    id=o.id,
                    order_number=o.order_number,
                    quotation_id=o.quotation_id,
                    customer_id=o.customer_id,
                    sales_rep_id=o.sales_rep_id,
                    status=o.status,
                    total_amount=o.total_amount,
                    currency=o.currency,
                    created_at=o.created_at,
                    updated_at=o.updated_at,
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
                        for l in o.lines
                    ],
                )
                for o in orders
            ],
            total=total,
            page=page,
            page_size=page_size,
        )
