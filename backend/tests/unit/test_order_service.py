import os
import sys
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

try:
    import pytest
    mark_asyncio = pytest.mark.asyncio
except ImportError:
    def mark_asyncio(func):
        return func

from app.models.order import Order, OrderLine, OrderStatus
from app.models.product import Product, ProductCategory
from app.models.quotation import Quotation, QuotationLine, QuotationStatus
from app.models.subscription import (
    BillingSchedule,
    BillingScheduleStatus,
    Invoice,
    InvoiceStatus,
    Subscription,
    SubscriptionStatus,
)
from app.models.warehouse import FulfillmentSplit, FulfillmentSplitStatus
from app.schemas.warehouse import FulfillmentPlanResponse, FulfillmentSplitResponse
from app.services.order_service import OrderService


def create_mock_product(
    product_id: uuid.UUID,
    name: str,
    category: ProductCategory,
    base_price: float = 1000.0,
) -> Product:
    prod = MagicMock(spec=Product)
    prod.id = product_id
    prod.name = name
    prod.category = category
    prod.unit = "unit"
    return prod


@mark_asyncio
async def test_order_creation_connects_fulfillment_and_hybrid_billing():
    """
    Test that creating an Order from an approved quotation:
    1. Instantiates Order and copies lines to OrderLine.
    2. Calls WarehouseSplitter to create FulfillmentSplits.
    3. Generates one-time Invoice for Hardware line.
    4. Calls SubscriptionService for Subscription line.
    5. Updates quotation status to CONFIRMED.
    """
    customer_id = uuid.uuid4()
    sales_rep_id = uuid.uuid4()
    quote_id = uuid.uuid4()

    # Products: 1 Hardware, 1 Subscription
    p_hw = create_mock_product(uuid.uuid4(), "Edge Gateway 5000", ProductCategory.HARDWARE)
    p_sub = create_mock_product(uuid.uuid4(), "DealFlow360 Enterprise SaaS", ProductCategory.SUBSCRIPTION)

    line_hw = MagicMock(spec=QuotationLine)
    line_hw.id = uuid.uuid4()
    line_hw.product_id = p_hw.id
    line_hw.variant_id = None
    line_hw.quantity = 2
    line_hw.unit_price = 2499.0
    line_hw.discount_percent = 5.0
    line_hw.line_total = 4748.10
    line_hw.margin_percent = 40.0
    line_hw.product = p_hw
    line_hw.variant = None

    line_sub = MagicMock(spec=QuotationLine)
    line_sub.id = uuid.uuid4()
    line_sub.product_id = p_sub.id
    line_sub.variant_id = None
    line_sub.quantity = 10
    line_sub.unit_price = 89.0
    line_sub.discount_percent = 0.0
    line_sub.line_total = 890.00
    line_sub.margin_percent = 85.0
    line_sub.product = p_sub
    line_sub.variant = None

    mock_quote = MagicMock(spec=Quotation)
    mock_quote.id = quote_id
    mock_quote.customer_id = customer_id
    mock_quote.sales_rep_id = sales_rep_id
    mock_quote.status = QuotationStatus.APPROVED
    mock_quote.total_amount = 5638.10
    mock_quote.lines = [line_hw, line_sub]

    mock_session = AsyncMock()
    service = OrderService(mock_session)

    # Mock quotation repo
    service.quotation_repo.get_by_id = AsyncMock(return_value=mock_quote)

    # Mock order repo
    created_orders = []

    async def mock_create_order(order: Order):
        created_orders.append(order)
        order.lines = [
            OrderLine(
                id=uuid.uuid4(),
                order_id=order.id,
                product_id=line_hw.product_id,
                product=p_hw,
                quantity=line_hw.quantity,
                unit_price=line_hw.unit_price,
                discount_percent=line_hw.discount_percent,
                line_total=line_hw.line_total,
                margin_percent=line_hw.margin_percent,
            ),
            OrderLine(
                id=uuid.uuid4(),
                order_id=order.id,
                product_id=line_sub.product_id,
                product=p_sub,
                quantity=line_sub.quantity,
                unit_price=line_sub.unit_price,
                discount_percent=line_sub.discount_percent,
                line_total=line_sub.line_total,
                margin_percent=line_sub.margin_percent,
            ),
        ]
        return order

    service.order_repo.create_order = AsyncMock(side_effect=mock_create_order)
    service.order_repo.get_by_id = AsyncMock(side_effect=lambda oid: created_orders[0] if created_orders else None)

    # Mock WarehouseSplitter
    mock_split = MagicMock(spec=FulfillmentSplit)
    mock_split.id = uuid.uuid4()
    mock_split.order_id = quote_id
    mock_split.product_id = p_hw.id
    mock_split.warehouse_id = uuid.uuid4()
    mock_split.allocated_quantity = 2
    mock_split.shipping_cost = 20.0
    mock_split.status = FulfillmentSplitStatus.PENDING
    mock_split.created_at = datetime.now(timezone.utc)
    mock_split.updated_at = datetime.now(timezone.utc)

    service.warehouse_splitter.suggest_split = AsyncMock(
        return_value=FulfillmentPlanResponse(
            order_id=quote_id,
            total_allocated=2,
            total_backordered=0,
            total_shipping_cost=20.0,
            splits=[FulfillmentSplitResponse.model_validate(mock_split)],
            explanations=["Cheapest warehouse allocated"],
        )
    )
    service.split_repo.get_splits_by_order = AsyncMock(return_value=[mock_split])

    # Mock Invoice repo
    created_invoices = []

    async def mock_create_inv(inv: Invoice):
        created_invoices.append(inv)
        return inv

    service.invoice_repo.create_invoice = AsyncMock(side_effect=mock_create_inv)
    service.invoice_repo.get_invoices_by_order = AsyncMock(
        return_value=[
            Invoice(
                id=uuid.uuid4(),
                order_id=quote_id,
                invoice_number="INV-202609-001",
                amount=4748.10,
                status=InvoiceStatus.PENDING,
                due_date=datetime.now(timezone.utc),
            )
        ]
    )

    # Mock SubscriptionService
    mock_subscription = Subscription(
        id=uuid.uuid4(),
        order_id=quote_id,
        customer_id=customer_id,
        product_id=p_sub.id,
        plan_id=uuid.uuid4(),
        start_date=datetime.now(timezone.utc),
        status=SubscriptionStatus.ACTIVE,
        quantity=10,
        unit_price=89.0,
        prorated_amount=0.0,
    )
    service.subscription_service.create_subscription_from_order_line = AsyncMock(return_value=mock_subscription)
    service.sub_repo.get_subscriptions_by_order = AsyncMock(return_value=[mock_subscription])

    # Execute Order Creation
    result = await service.create_order_from_quotation(quotation_id=quote_id)

    # Verifications
    assert result.customer_id == customer_id
    assert result.total_amount == 5638.10
    assert result.status == OrderStatus.PENDING
    assert len(result.lines) == 2
    assert mock_quote.status == QuotationStatus.CONFIRMED

    # Verify warehouse allocation was called
    service.warehouse_splitter.suggest_split.assert_awaited_once()

    # Verify 1 invoice created for Hardware
    assert len(created_invoices) == 1
    assert created_invoices[0].amount == 4748.10

    # Verify SubscriptionService was called for SaaS line
    service.subscription_service.create_subscription_from_order_line.assert_awaited_once()


@mark_asyncio
async def test_order_fulfillment_status_flow():
    """
    Test fulfillment status transitions:
    - Pending splits transition to 'fulfilled'.
    - If backorder exists, Order status = 'processing'.
    - If all splits fulfilled, Order status = 'fulfilled'.
    """
    order_id = uuid.uuid4()
    mock_order = MagicMock(spec=Order)
    mock_order.id = order_id
    mock_order.status = OrderStatus.PENDING

    mock_split1 = MagicMock(spec=FulfillmentSplit)
    mock_split1.id = uuid.uuid4()
    mock_split1.order_id = order_id
    mock_split1.allocated_quantity = 5
    mock_split1.status = FulfillmentSplitStatus.PENDING
    mock_split1.warehouse_id = uuid.uuid4()
    mock_split1.product_id = uuid.uuid4()
    mock_split1.shipping_cost = 50.0
    mock_split1.created_at = datetime.now(timezone.utc)
    mock_split1.updated_at = datetime.now(timezone.utc)

    mock_split2 = MagicMock(spec=FulfillmentSplit)
    mock_split2.id = uuid.uuid4()
    mock_split2.order_id = order_id
    mock_split2.allocated_quantity = 3
    mock_split2.status = FulfillmentSplitStatus.BACKORDERED
    mock_split2.warehouse_id = None
    mock_split2.product_id = uuid.uuid4()
    mock_split2.shipping_cost = 0.0
    mock_split2.created_at = datetime.now(timezone.utc)
    mock_split2.updated_at = datetime.now(timezone.utc)

    mock_session = AsyncMock()
    service = OrderService(mock_session)
    service.order_repo.get_by_id = AsyncMock(return_value=mock_order)
    service.split_repo.get_splits_by_order = AsyncMock(return_value=[mock_split1, mock_split2])

    result = await service.process_order_fulfillment(order_id)

    # Split 1 transitioned to fulfilled
    assert mock_split1.status == FulfillmentSplitStatus.FULFILLED
    # Split 2 remains backordered
    assert mock_split2.status == FulfillmentSplitStatus.BACKORDERED
    # Order status becomes 'processing' due to remaining backorders
    assert mock_order.status == OrderStatus.PROCESSING
    assert result.splits_fulfilled == 1
    assert result.splits_backordered == 1


if __name__ == "__main__":
    import asyncio
    print("Running Order Fulfillment & Billing Integration Tests...")
    asyncio.run(test_order_creation_connects_fulfillment_and_hybrid_billing())
    print("✔ test_order_creation_connects_fulfillment_and_hybrid_billing passed")
    asyncio.run(test_order_fulfillment_status_flow())
    print("✔ test_order_fulfillment_status_flow passed")
    print("ALL ORDER SERVICE TESTS PASSED SUCCESSFULLY!")
