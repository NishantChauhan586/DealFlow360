import os
import sys
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

try:
    # pyrefly: ignore [missing-import]
    import pytest
    mark_asyncio = pytest.mark.asyncio
except ImportError:
    def mark_asyncio(func):
        return func

from app.models.product import Product, ProductCategory
from app.models.product_pairing import ProductPairing
from app.models.quotation import Quotation, QuotationLine, QuotationStatus
from app.schemas.price_list import PriceLookupResponse
from app.services.upsell_service import UpsellService


def create_mock_product(
    product_id: uuid.UUID,
    name: str,
    category: ProductCategory,
    base_price: float = 1000.0,
    is_active: bool = True,
) -> Product:
    prod = MagicMock(spec=Product)
    prod.id = product_id
    prod.name = name
    prod.category = category
    prod.description = f"Description for {name}"
    prod.unit = "unit"
    prod.is_active = is_active
    return prod


def create_mock_pairing(
    source_prod: Product,
    target_prod: Product,
    score: float,
    is_promoted: bool = False,
    min_margin_threshold: float = 0.0,
) -> ProductPairing:
    pairing = MagicMock(spec=ProductPairing)
    pairing.id = uuid.uuid4()
    pairing.source_product_id = source_prod.id
    pairing.target_product_id = target_prod.id
    pairing.source_product = source_prod
    pairing.target_product = target_prod
    pairing.co_purchase_score = score
    pairing.is_promoted = is_promoted
    pairing.min_margin_threshold = min_margin_threshold
    return pairing


@mark_asyncio
async def test_upsell_suggestions_ranking_and_cart_exclusion():
    """
    Test that:
    1. Promoted products are prioritized over unpromoted products.
    2. Products already in the cart are excluded.
    3. Co-purchase score breaks ties among unpromoted items.
    """
    # Mock Products
    p_laptop = create_mock_product(uuid.uuid4(), "Enterprise Laptop 15", ProductCategory.HARDWARE)
    p_bag = create_mock_product(uuid.uuid4(), "Protective Carrying Case", ProductCategory.HARDWARE)
    p_warranty = create_mock_product(uuid.uuid4(), "3-Year Extended Warranty", ProductCategory.SERVICE)
    p_dock = create_mock_product(uuid.uuid4(), "Thunderbolt Dock", ProductCategory.HARDWARE)
    p_mouse = create_mock_product(uuid.uuid4(), "Wireless Mouse", ProductCategory.HARDWARE)

    # Cart currently has Laptop and Mouse
    quote_id = uuid.uuid4()
    mock_quotation = MagicMock(spec=Quotation)
    mock_quotation.id = quote_id
    mock_quotation.lines = [
        MagicMock(spec=QuotationLine, product_id=p_laptop.id),
        MagicMock(spec=QuotationLine, product_id=p_mouse.id),
    ]

    # Candidate Pairings from Laptop:
    # 1. Laptop -> Mouse (affinity 0.95, but mouse is ALREADY in cart -> should be excluded)
    # 2. Laptop -> Warranty (affinity 0.85, is_promoted=True -> should rank FIRST)
    # 3. Laptop -> Dock (affinity 0.90, is_promoted=False -> should rank SECOND)
    # 4. Laptop -> Bag (affinity 0.70, is_promoted=False -> should rank THIRD)
    pairing_mouse = create_mock_pairing(p_laptop, p_mouse, 0.95, is_promoted=False, min_margin_threshold=10.0)
    pairing_warranty = create_mock_pairing(p_laptop, p_warranty, 0.85, is_promoted=True, min_margin_threshold=10.0)
    pairing_dock = create_mock_pairing(p_laptop, p_dock, 0.90, is_promoted=False, min_margin_threshold=10.0)
    pairing_bag = create_mock_pairing(p_laptop, p_bag, 0.70, is_promoted=False, min_margin_threshold=10.0)

    all_pairings = [pairing_warranty, pairing_dock, pairing_mouse, pairing_bag]

    mock_session = AsyncMock()
    service = UpsellService(mock_session)

    # Mock repos
    service.quotation_repo.get_by_id = AsyncMock(return_value=mock_quotation)
    service.pairing_repo.get_pairings_for_source_products = AsyncMock(return_value=all_pairings)

    # Mock pricing: base price $200 for all items
    async def mock_calculate_price(product_id, customer_tier=None):
        return PriceLookupResponse(
            product_id=product_id,
            product_name="Mock",
            customer_tier=customer_tier,
            currency="USD",
            base_price=200.0,
            resolved_price_list_id=uuid.uuid4(),
            resolved_price_list_name="Default List",
            match_strategy="exact_product_tier",
            as_of_date=datetime.now(timezone.utc),
        )

    service.pricing_service.calculate_price = AsyncMock(side_effect=mock_calculate_price)

    result = await service.get_suggestions(quotation_id=quote_id, limit=5)

    # Assertions
    assert result.quotation_id == quote_id
    assert result.cart_product_count == 2
    assert result.total_suggestions == 3  # Mouse was excluded because it is already in cart

    # Check ranking
    # 1st item must be the PROMOTED Warranty
    assert result.suggestions[0].product_id == p_warranty.id
    assert result.suggestions[0].is_promoted is True
    assert "Strategic Enterprise Add-on" in result.suggestions[0].reason

    # 2nd item must be Dock (higher co-purchase score 0.90)
    assert result.suggestions[1].product_id == p_dock.id
    assert result.suggestions[1].co_purchase_score == 0.90

    # 3rd item must be Bag (lower score 0.70)
    assert result.suggestions[2].product_id == p_bag.id
    assert result.suggestions[2].co_purchase_score == 0.70


@mark_asyncio
async def test_upsell_min_margin_threshold_filtering():
    """
    Test that pairings with margin percentage below min_margin_threshold are filtered out.
    """
    p_server = create_mock_product(uuid.uuid4(), "Enterprise Server Node", ProductCategory.HARDWARE)
    p_service_high_margin = create_mock_product(uuid.uuid4(), "Consulting Pack", ProductCategory.SERVICE)
    p_low_margin_accessory = create_mock_product(uuid.uuid4(), "Low Margin Cable", ProductCategory.HARDWARE)

    quote_id = uuid.uuid4()
    mock_quotation = MagicMock(spec=Quotation)
    mock_quotation.id = quote_id
    mock_quotation.lines = [MagicMock(spec=QuotationLine, product_id=p_server.id)]

    # Pairing 1: High margin allowed (threshold 20%, actual margin at cost_factor 0.6 is 40% -> PASS)
    pairing_high = create_mock_pairing(p_server, p_service_high_margin, 0.85, is_promoted=False, min_margin_threshold=20.0)

    # Pairing 2: Strict threshold (threshold 50%, actual margin at cost_factor 0.6 is 40% -> FAIL/FILTERED OUT)
    pairing_strict = create_mock_pairing(p_server, p_low_margin_accessory, 0.90, is_promoted=False, min_margin_threshold=50.0)

    mock_session = AsyncMock()
    service = UpsellService(mock_session)

    service.quotation_repo.get_by_id = AsyncMock(return_value=mock_quotation)
    service.pairing_repo.get_pairings_for_source_products = AsyncMock(return_value=[pairing_strict, pairing_high])

    async def mock_calculate_price(product_id, customer_tier=None):
        return PriceLookupResponse(
            product_id=product_id,
            product_name="Mock",
            customer_tier=customer_tier,
            currency="USD",
            base_price=100.0,  # cost = $60, margin = $40 (40%)
            resolved_price_list_id=uuid.uuid4(),
            resolved_price_list_name="Default List",
            match_strategy="default_catalog",
            as_of_date=datetime.now(timezone.utc),
        )

    service.pricing_service.calculate_price = AsyncMock(side_effect=mock_calculate_price)

    result = await service.get_suggestions(quotation_id=quote_id, cost_factor=0.60)

    # Pairing 2 requires 50% min margin, but actual is 40% -> it must be filtered out
    assert result.total_suggestions == 1
    assert result.suggestions[0].product_id == p_service_high_margin.id
    assert result.suggestions[0].margin_percent == 40.0
    assert result.suggestions[0].margin_dollars == 40.0
    assert result.suggestions[0].margin_delta == 40.0


@mark_asyncio
async def test_upsell_empty_cart_graceful_handling():
    """
    Test that an empty cart returns zero suggestions gracefully without errors.
    """
    quote_id = uuid.uuid4()
    mock_quotation = MagicMock(spec=Quotation)
    mock_quotation.id = quote_id
    mock_quotation.lines = []

    mock_session = AsyncMock()
    service = UpsellService(mock_session)
    service.quotation_repo.get_by_id = AsyncMock(return_value=mock_quotation)

    result = await service.get_suggestions(quotation_id=quote_id)
    assert result.cart_product_count == 0
    assert result.total_suggestions == 0
    assert result.suggestions == []


if __name__ == "__main__":
    import asyncio
    print("Running Upsell & Cross-Sell Unit Tests...")
    asyncio.run(test_upsell_suggestions_ranking_and_cart_exclusion())
    print("✔ test_upsell_suggestions_ranking_and_cart_exclusion passed")
    asyncio.run(test_upsell_min_margin_threshold_filtering())
    print("✔ test_upsell_min_margin_threshold_filtering passed")
    asyncio.run(test_upsell_empty_cart_graceful_handling())
    print("✔ test_upsell_empty_cart_graceful_handling passed")
    print("ALL UPSELL ENGINE UNIT TESTS PASSED SUCCESSFULLY!")
