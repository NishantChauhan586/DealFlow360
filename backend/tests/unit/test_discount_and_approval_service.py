import uuid
import pytest

from app.models.discount_tier import DiscountTier
from app.models.approval_chain import ApprovalChain
from app.models.product import ProductCategory
from app.services.discount_config_service import DiscountConfigService
from app.services.approval_config_service import ApprovalConfigService


@pytest.mark.asyncio
async def test_discount_config_service_limits():
    """
    Verify exact tier matching and fallback behavior for discount limits.
    """
    gold_hardware = DiscountTier(
        id=uuid.uuid4(),
        name="Gold Hardware",
        customer_tier="gold",
        category=ProductCategory.HARDWARE,
        max_discount_percent=15.0,
    )
    bronze_hardware = DiscountTier(
        id=uuid.uuid4(),
        name="Bronze Hardware",
        customer_tier="bronze",
        category=ProductCategory.HARDWARE,
        max_discount_percent=5.0,
    )

    class MockDiscountRepo:
        def __init__(self, session):
            pass

        async def get_by_tier_and_category(self, customer_tier, category):
            if customer_tier.lower() == "gold" and category == ProductCategory.HARDWARE:
                return gold_hardware
            if customer_tier.lower() == "bronze" and category == ProductCategory.HARDWARE:
                return bronze_hardware
            return None

    service = DiscountConfigService(session=None)  # type: ignore
    service.tier_repo = MockDiscountRepo(None)  # type: ignore

    # Test 1: Exact Gold match (15.0%)
    res_gold = await service.get_discount_limit("gold", ProductCategory.HARDWARE)
    assert res_gold.max_discount_percent == 15.0
    assert res_gold.rule_applied == "exact_tier_category_match"

    # Test 2: Fallback to Bronze for unknown tier (5.0%)
    res_unknown = await service.get_discount_limit("enterprise", ProductCategory.HARDWARE)
    assert res_unknown.max_discount_percent == 5.0
    assert res_unknown.rule_applied == "bronze_fallback_default"


@pytest.mark.asyncio
async def test_approval_config_service_risk_resolution():
    """
    Verify risk-based approval chain evaluation for low, medium, and high risk BRS scores.
    """
    chain_medium = ApprovalChain(
        id=uuid.uuid4(),
        name="Medium Risk Policy",
        trigger_condition={"min_risk": 3.0, "max_risk": 6.9},
        sequence=["sales_manager"],
        is_active=True,
    )
    chain_high = ApprovalChain(
        id=uuid.uuid4(),
        name="High Risk Executive Policy",
        trigger_condition={"min_risk": 7.0, "max_risk": 10.0},
        sequence=["sales_manager", "finance"],
        is_active=True,
    )

    class MockApprovalRepo:
        def __init__(self, session):
            pass

        async def get_active_chains(self):
            return [chain_medium, chain_high]

    service = ApprovalConfigService(session=None)  # type: ignore
    service.chain_repo = MockApprovalRepo(None)  # type: ignore

    # Test 1: Low risk (BRS = 1.5) -> Auto-approved (no approval required)
    res_low = await service.resolve_chain_for_risk(1.5)
    assert res_low.approval_required is False
    assert res_low.sequence == []

    # Test 2: Medium risk (BRS = 5.2) -> Requires ["sales_manager"]
    res_med = await service.resolve_chain_for_risk(5.2)
    assert res_med.approval_required is True
    assert res_med.sequence == ["sales_manager"]
    assert "Sales Manager" in res_med.explanation

    # Test 3: High risk (BRS = 8.5) -> Requires ["sales_manager", "finance"]
    res_high = await service.resolve_chain_for_risk(8.5)
    assert res_high.approval_required is True
    assert res_high.sequence == ["sales_manager", "finance"]
    assert "Sales Manager -> Finance" in res_high.explanation
