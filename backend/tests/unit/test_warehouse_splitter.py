import uuid
import pytest

from app.models.product import Product, ProductCategory
from app.models.quotation import Quotation, QuotationLine, QuotationStatus
from app.models.warehouse import FulfillmentSplitStatus, Inventory, Warehouse
from app.services.warehouse_splitter import WarehouseSplitter


@pytest.mark.asyncio
async def test_warehouse_splitter_insufficient_stock_backorder_scenario():
    """
    Unit Test Scenario:
    Order requests 100 units of a hardware product.
    - Warehouse 1 (Main, weight 1.0): on_hand = 50, reserved = 5 -> available = 45 units
    - Warehouse 2 (East, weight 1.6): on_hand = 20, reserved = 2 -> available = 18 units
    Total available = 63 units (< 100 requested).
    
    Expected Allocation:
    1. 45 units from Main (Cheapest: 45 * 1.0 * 10 = $450.00)
    2. 18 units from East (Next cheapest: 18 * 1.6 * 10 = $288.00)
    3. 37 units BACKORDERED (Status = 'backordered', Shipping = $0.00)
    Total shipping cost = $738.00, is_fully_fulfillable = False.
    """
    order_id = uuid.uuid4()
    prod_id = uuid.uuid4()
    wh_main_id = uuid.uuid4()
    wh_east_id = uuid.uuid4()

    product = Product(
        id=prod_id,
        name="Edge Gateway 5000",
        category=ProductCategory.HARDWARE,
        unit="unit",
    )

    line = QuotationLine(
        id=uuid.uuid4(),
        quotation_id=order_id,
        product_id=prod_id,
        product=product,
        quantity=100,
        unit_price=2499.0,
        line_total=249900.0,
    )

    quote = Quotation(
        id=order_id,
        customer_id=uuid.uuid4(),
        sales_rep_id=uuid.uuid4(),
        status=QuotationStatus.APPROVED,
        lines=[line],
    )

    wh_main = Warehouse(
        id=wh_main_id,
        name="Main Central Hub",
        address="100 Logistics Blvd",
        shipping_cost_weight=1.0,
        is_active=True,
    )

    wh_east = Warehouse(
        id=wh_east_id,
        name="East Coast Hub",
        address="450 Industrial Pkwy",
        shipping_cost_weight=1.6,
        is_active=True,
    )

    inv_main = Inventory(
        id=uuid.uuid4(),
        warehouse_id=wh_main_id,
        product_id=prod_id,
        quantity_on_hand=50,
        reserved_quantity=5,  # available = 45
        warehouse=wh_main,
        product=product,
    )

    inv_east = Inventory(
        id=uuid.uuid4(),
        warehouse_id=wh_east_id,
        product_id=prod_id,
        quantity_on_hand=20,
        reserved_quantity=2,  # available = 18
        warehouse=wh_east,
        product=product,
    )

    class MockQuoteRepo:
        def __init__(self, s): pass
        async def get_by_id(self, q_id): return quote

    class MockOrderRepo:
        def __init__(self, s): pass
        async def get_by_id(self, o_id): return None

    class MockInventoryRepo:
        def __init__(self, s): pass
        async def list_by_product_cheapest_warehouses_first(self, p_id):
            return [inv_main, inv_east]

    class MockSplitRepo:
        def __init__(self, s): pass
        async def delete_by_order(self, o_id): pass
        async def create_many(self, splits): return splits

    class MockSession:
        async def commit(self): pass

    splitter = WarehouseSplitter(session=MockSession())  # type: ignore
    splitter.order_repo = MockOrderRepo(None)  # type: ignore
    splitter.quote_repo = MockQuoteRepo(None)  # type: ignore
    splitter.inventory_repo = MockInventoryRepo(None)  # type: ignore
    splitter.split_repo = MockSplitRepo(None)  # type: ignore

    plan = await splitter.suggest_split(order_id)

    # Assertions
    assert plan.total_allocated == 63
    assert plan.total_backordered == 37
    assert plan.is_fully_fulfillable is False
    assert plan.total_shipping_cost == 738.00  # 450 + 288

    assert len(plan.splits) == 3

    # Split 1: Main
    assert plan.splits[0].warehouse_id == wh_main_id
    assert plan.splits[0].allocated_quantity == 45
    assert plan.splits[0].shipping_cost == 450.00
    assert plan.splits[0].status == FulfillmentSplitStatus.PENDING

    # Split 2: East
    assert plan.splits[1].warehouse_id == wh_east_id
    assert plan.splits[1].allocated_quantity == 18
    assert plan.splits[1].shipping_cost == 288.00
    assert plan.splits[1].status == FulfillmentSplitStatus.PENDING

    # Split 3: Backordered
    assert plan.splits[2].warehouse_id is None
    assert plan.splits[2].allocated_quantity == 37
    assert plan.splits[2].shipping_cost == 0.00
    assert plan.splits[2].status == FulfillmentSplitStatus.BACKORDERED
    assert "BACKORDERED: 37/100 units" in plan.explanation
