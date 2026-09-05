from datetime import datetime, timedelta, timezone
import uuid
import pytest
from pydantic import ValidationError

from app.models.product import Product, ProductCategory
from app.models.price_list import PriceList
from app.schemas.price_list import PriceListCreate
from app.services.pricing_service import PricingService


def test_price_list_effective_date_validation():
    now = datetime.now(timezone.utc)
    future = now + timedelta(days=30)
    past = now - timedelta(days=30)

    # Valid: effective_from < effective_to
    valid = PriceListCreate(
        name="Valid Schedule",
        currency="USD",
        base_price=100.0,
        effective_from=now,
        effective_to=future,
    )
    assert valid.effective_from < valid.effective_to

    # Invalid: effective_from >= effective_to
    with pytest.raises(ValidationError):
        PriceListCreate(
            name="Invalid Schedule",
            currency="USD",
            base_price=100.0,
            effective_from=now,
            effective_to=past,
        )


@pytest.mark.asyncio
async def test_pricing_service_exact_and_fallback_logic(monkeypatch):
    """
    Unit test verifying the multi-tier deterministic resolution hierarchy.
    """
    prod_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    mock_product = Product(
        id=prod_id,
        name="Test Gateway",
        category=ProductCategory.HARDWARE,
        unit="unit",
        tax_rate=0.18,
        is_active=True,
    )

    exact_entry = PriceList(
        id=uuid.uuid4(),
        name="Gold Product Price",
        currency="USD",
        customer_tier="gold",
        product_id=prod_id,
        base_price=150.0,
        effective_from=now - timedelta(days=10),
        effective_to=now + timedelta(days=10),
    )

    product_default_entry = PriceList(
        id=uuid.uuid4(),
        name="Default Product Price",
        currency="USD",
        customer_tier=None,
        product_id=prod_id,
        base_price=200.0,
        effective_from=now - timedelta(days=10),
        effective_to=now + timedelta(days=10),
    )

    class MockProductRepo:
        def __init__(self, session):
            pass

        async def get_by_id(self, p_id):
            return mock_product if p_id == prod_id else None

    class MockPriceRepo:
        def __init__(self, session):
            pass

        async def find_effective_prices(self, p_id, as_of):
            return [exact_entry, product_default_entry]

    # Instantiate service with mocked repos
    service = PricingService(session=None)  # type: ignore
    service.product_repo = MockProductRepo(None)  # type: ignore
    service.price_repo = MockPriceRepo(None)  # type: ignore

    # Test 1: Exact Match for Gold Tier
    res_gold = await service.calculate_price(prod_id, customer_tier="gold", as_of_date=now)
    assert res_gold.base_price == 150.0
    assert res_gold.match_strategy == "exact_product_tier"

    # Test 2: Fallback to Product Default for Silver Tier (since silver specific doesn't exist)
    res_silver = await service.calculate_price(prod_id, customer_tier="silver", as_of_date=now)
    assert res_silver.base_price == 200.0
    assert res_silver.match_strategy == "product_default"
