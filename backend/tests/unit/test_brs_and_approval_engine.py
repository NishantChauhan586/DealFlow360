from datetime import datetime, timezone
import uuid
# pyrefly: ignore [missing-import]
import pytest

from app.models.approval_request import ApprovalRequest, ApprovalStepStatus
from app.models.discount_tier import DiscountTier
from app.models.product import Product, ProductCategory
from app.models.quotation import Quotation, QuotationLine, QuotationStatus
from app.schemas.approval_request import ApprovalActionRequest
from app.services.approval_engine import ApprovalEngineService
from app.services.risk_score import RiskScoreService


@pytest.mark.asyncio
async def test_brs_hardware_within_limits():
    """
    Test Case 1: Hardware 12% discount (Gold tier allowed 15%) -> Fine (Score 0.0, Low Risk).
    """
    quote_id = uuid.uuid4()
    p_hw = Product(
        id=uuid.uuid4(),
        name="Enterprise Server X1",
        category=ProductCategory.HARDWARE,
        unit="unit",
    )
    line = QuotationLine(
        id=uuid.uuid4(),
        quotation_id=quote_id,
        product_id=p_hw.id,
        product=p_hw,
        quantity=1,
        unit_price=10000.0,
        discount_percent=12.0,
        line_total=8800.0,
    )
    quote = Quotation(
        id=quote_id,
        customer_id=uuid.uuid4(),
        sales_rep_id=uuid.uuid4(),
        status=QuotationStatus.DRAFT,
        lines=[line],
    )

    gold_hw_tier = DiscountTier(
        id=uuid.uuid4(),
        name="Gold Hardware",
        customer_tier="gold",
        category=ProductCategory.HARDWARE,
        max_discount_percent=15.0,
    )

    class MockQuoteRepo:
        def __init__(self, s): pass
        async def get_by_id(self, q_id): return quote
        async def save(self, q): return q

    class MockDiscountRepo:
        def __init__(self, s): pass
        async def get_by_tier_and_category(self, tier, cat): return gold_hw_tier

    service = RiskScoreService(session=None)  # type: ignore
    service.quote_repo = MockQuoteRepo(None)  # type: ignore
    service.discount_repo = MockDiscountRepo(None)  # type: ignore

    res = await service.calculate_blended_score(quote_id, customer_tier="gold")
    assert res.blended_risk_score == 0.0
    assert res.risk_level == "Low"
    assert res.lines_breakdown[0].excess == 0.0


@pytest.mark.asyncio
async def test_brs_service_overage_flagged():
    """
    Test Case 2: Service 18% discount (Gold tier allowed 10%) -> Flagged (Excess 8% * 1.5 weight = 12.0 score -> Medium Risk).
    """
    quote_id = uuid.uuid4()
    p_svc = Product(
        id=uuid.uuid4(),
        name="Consulting SLA",
        category=ProductCategory.SERVICE,
        unit="hour",
    )
    line = QuotationLine(
        id=uuid.uuid4(),
        quotation_id=quote_id,
        product_id=p_svc.id,
        product=p_svc,
        quantity=10,
        unit_price=200.0,
        discount_percent=18.0,
        line_total=1640.0,
    )
    quote = Quotation(
        id=quote_id,
        customer_id=uuid.uuid4(),
        sales_rep_id=uuid.uuid4(),
        status=QuotationStatus.DRAFT,
        lines=[line],
    )

    gold_svc_tier = DiscountTier(
        id=uuid.uuid4(),
        name="Gold Service",
        customer_tier="gold",
        category=ProductCategory.SERVICE,
        max_discount_percent=10.0,
    )

    class MockQuoteRepo:
        def __init__(self, s): pass
        async def get_by_id(self, q_id): return quote
        async def save(self, q): return q

    class MockDiscountRepo:
        def __init__(self, s): pass
        async def get_by_tier_and_category(self, tier, cat): return gold_svc_tier

    service = RiskScoreService(session=None)  # type: ignore
    service.quote_repo = MockQuoteRepo(None)  # type: ignore
    service.discount_repo = MockDiscountRepo(None)  # type: ignore

    res = await service.calculate_blended_score(quote_id, customer_tier="gold")
    # Excess = 18 - 10 = 8.0%. Weight for service = 1.5. Score = 8.0 * 1.5 = 12.0
    # Overall discount % = 18.0%, exceeds gold cap 15.0% by 3.0% -> penalty = 3.0 * 1.5 = 4.5
    # Total blended = 12.0 + 4.5 = 16.5 -> High Risk
    assert res.lines_breakdown[0].excess == 8.0
    assert res.lines_breakdown[0].line_score == 12.0
    assert res.blended_risk_score >= 12.0


@pytest.mark.asyncio
async def test_brs_multiple_lines_aggregated_score():
    """
    Test Case 3: Multiple lines with 2% over each -> Aggregated score.
    - Hardware: 17% (allowed 15%, excess 2% * 1.0 = 2.0)
    - Service: 12% (allowed 10%, excess 2% * 1.5 = 3.0)
    - Subscription: 14% (allowed 12%, excess 2% * 1.2 = 2.4)
    Raw score = 2.0 + 3.0 + 2.4 = 7.4 (Medium Risk).
    """
    quote_id = uuid.uuid4()
    p_hw = Product(id=uuid.uuid4(), name="Hardware Node", category=ProductCategory.HARDWARE)
    p_svc = Product(id=uuid.uuid4(), name="Setup Svc", category=ProductCategory.SERVICE)
    p_sub = Product(id=uuid.uuid4(), name="Cloud License", category=ProductCategory.SUBSCRIPTION)

    l1 = QuotationLine(
        id=uuid.uuid4(), quotation_id=quote_id, product_id=p_hw.id, product=p_hw,
        quantity=1, unit_price=1000.0, discount_percent=17.0, line_total=830.0,
    )
    l2 = QuotationLine(
        id=uuid.uuid4(), quotation_id=quote_id, product_id=p_svc.id, product=p_svc,
        quantity=1, unit_price=1000.0, discount_percent=12.0, line_total=880.0,
    )
    l3 = QuotationLine(
        id=uuid.uuid4(), quotation_id=quote_id, product_id=p_sub.id, product=p_sub,
        quantity=1, unit_price=1000.0, discount_percent=14.0, line_total=860.0,
    )

    quote = Quotation(
        id=quote_id,
        customer_id=uuid.uuid4(),
        sales_rep_id=uuid.uuid4(),
        status=QuotationStatus.DRAFT,
        lines=[l1, l2, l3],
    )

    tiers = {
        ProductCategory.HARDWARE: DiscountTier(name="Gold HW", customer_tier="gold", category=ProductCategory.HARDWARE, max_discount_percent=15.0),
        ProductCategory.SERVICE: DiscountTier(name="Gold Svc", customer_tier="gold", category=ProductCategory.SERVICE, max_discount_percent=10.0),
        ProductCategory.SUBSCRIPTION: DiscountTier(name="Gold Sub", customer_tier="gold", category=ProductCategory.SUBSCRIPTION, max_discount_percent=12.0),
    }

    class MockQuoteRepo:
        def __init__(self, s): pass
        async def get_by_id(self, q_id): return quote
        async def save(self, q): return q

    class MockDiscountRepo:
        def __init__(self, s): pass
        async def get_by_tier_and_category(self, tier, cat): return tiers.get(cat)

    service = RiskScoreService(session=None)  # type: ignore
    service.quote_repo = MockQuoteRepo(None)  # type: ignore
    service.discount_repo = MockDiscountRepo(None)  # type: ignore

    res = await service.calculate_blended_score(quote_id, customer_tier="gold")
    assert res.lines_breakdown[0].line_score == 2.0
    assert res.lines_breakdown[1].line_score == 3.0
    assert res.lines_breakdown[2].line_score == 2.4
    assert res.risk_level in ("Medium", "High")
    assert res.blended_risk_score >= 7.4


@pytest.mark.asyncio
async def test_approval_engine_rejection_reverts_to_draft():
    """
    Test Case 4: Approval rejection reverts quotation status back to 'draft'.
    """
    quote_id = uuid.uuid4()
    step_id = uuid.uuid4()

    quote = Quotation(
        id=quote_id,
        customer_id=uuid.uuid4(),
        sales_rep_id=uuid.uuid4(),
        status=QuotationStatus.PENDING_APPROVAL,
    )
    now = datetime.now(timezone.utc)
    step = ApprovalRequest(
        id=step_id,
        quotation_id=quote_id,
        step_order=1,
        role_required="sales_manager",
        status=ApprovalStepStatus.PENDING,
        requested_at=now,
        created_at=now,
        updated_at=now,
    )

    class MockQuoteRepo:
        def __init__(self, s): pass
        async def get_by_id(self, q_id): return quote
        async def save(self, q): return q

    class MockStepRepo:
        def __init__(self, s): pass
        async def list_by_quotation(self, q_id): return [step]
        async def update(self, s, u):
            s.status = u["status"]
            return s

    class MockSession:
        async def commit(self): pass

    service = ApprovalEngineService(session=MockSession())  # type: ignore
    service.quote_repo = MockQuoteRepo(None)  # type: ignore
    service.step_repo = MockStepRepo(None)  # type: ignore

    action = ApprovalActionRequest(
        step_id=step_id,
        action="reject",
        reason="Discount exceeds target contribution margin.",
    )

    res = await service.process_approval_action(
        quotation_id=quote_id,
        action_in=action,
        current_user_role="sales_manager",
        current_user_id=uuid.uuid4(),
    )

    assert res.status == QuotationStatus.DRAFT
    assert quote.status == QuotationStatus.DRAFT
    assert step.status == ApprovalStepStatus.REJECTED
