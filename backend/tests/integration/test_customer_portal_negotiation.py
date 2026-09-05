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

from fastapi import HTTPException
from app.models.order import Order, OrderLine, OrderStatus
from app.models.product import Product, ProductCategory
from app.models.quotation import Quotation, QuotationLine, QuotationStatus
from app.schemas.approval_request import BRSCalculationResponse, RiskLevel
from app.schemas.portal import NegotiationLineChange, QuotationNegotiationRequest
from app.services.customer_portal_service import CustomerPortalService


def setup_mock_quotation(
    customer_id: uuid.UUID,
    sales_rep_id: uuid.UUID,
    unit_price: float = 1000.0,
    qty: int = 5,
    discount: float = 5.0,
    initial_status: QuotationStatus = QuotationStatus.SENT_TO_CUSTOMER,
) -> Quotation:
    q_id = uuid.uuid4()
    line_id = uuid.uuid4()
    p_id = uuid.uuid4()

    mock_product = MagicMock(spec=Product)
    mock_product.id = p_id
    mock_product.name = "Edge Gateway 5000"
    mock_product.category = ProductCategory.HARDWARE
    mock_product.description = "Test Product"
    mock_product.unit = "unit"

    mock_line = MagicMock(spec=QuotationLine)
    mock_line.id = line_id
    mock_line.quotation_id = q_id
    mock_line.product_id = p_id
    mock_line.variant_id = None
    mock_line.quantity = qty
    mock_line.unit_price = unit_price
    mock_line.discount_percent = discount
    mock_line.line_total = round(qty * unit_price * (1 - discount / 100.0), 2)
    mock_line.margin_percent = 40.0
    mock_line.product = mock_product
    mock_line.variant = None
    mock_line.created_at = datetime.now(timezone.utc)
    mock_line.updated_at = datetime.now(timezone.utc)

    mock_quote = MagicMock(spec=Quotation)
    mock_quote.id = q_id
    mock_quote.customer_id = customer_id
    mock_quote.sales_rep_id = sales_rep_id
    mock_quote.status = initial_status
    mock_quote.total_amount = mock_line.line_total
    mock_quote.discount_total = round(qty * unit_price * (discount / 100.0), 2)
    mock_quote.blended_risk_score = 0.0
    mock_quote.created_at = datetime.now(timezone.utc)
    mock_quote.updated_at = datetime.now(timezone.utc)
    mock_quote.expires_at = None
    mock_quote.lines = [mock_line]
    mock_quote.approvals = []

    return mock_quote


@mark_asyncio
async def test_customer_quotation_security_isolation():
    """
    Test that a customer cannot view or negotiate a quote belonging to another customer.
    """
    customer_a = uuid.uuid4()
    customer_b = uuid.uuid4()
    rep_id = uuid.uuid4()

    mock_session = AsyncMock()
    service = CustomerPortalService(mock_session)

    quote_belonging_to_b = setup_mock_quotation(customer_id=customer_b, sales_rep_id=rep_id)
    service.quotation_repo.get_by_id = AsyncMock(return_value=quote_belonging_to_b)

    # Customer A attempts to access Customer B's quote
    with pytest.raises(HTTPException) as exc_info:
        await service.get_customer_quotation_or_404(
            quotation_id=quote_belonging_to_b.id,
            customer_id=customer_a,
        )
    assert exc_info.value.status_code == 404

    # Customer A attempts to negotiate Customer B's quote
    with pytest.raises(HTTPException) as exc_info2:
        await service.negotiate_quotation(
            quotation_id=quote_belonging_to_b.id,
            customer_id=customer_a,
            negotiation_in=QuotationNegotiationRequest(overall_discount=10.0),
        )
    assert exc_info2.value.status_code == 404


@mark_asyncio
async def test_negotiation_counter_offer_low_risk_auto_approved():
    """
    Test that a modest customer counter-offer within discount limits is auto-approved without blocking.
    """
    customer_id = uuid.uuid4()
    rep_id = uuid.uuid4()
    quote = setup_mock_quotation(customer_id=customer_id, sales_rep_id=rep_id, discount=5.0)

    mock_session = AsyncMock()
    service = CustomerPortalService(mock_session)
    service.quotation_repo.get_by_id = AsyncMock(return_value=quote)

    # Mock low-risk BRS result (score: 2.0, Low Risk)
    mock_brs_low = BRSCalculationResponse(
        quotation_id=quote.id,
        score=2.0,
        risk_level=RiskLevel.LOW,
        total_discount_percent=8.0,
        overall_tier_cap_percent=15.0,
        tier_cap_overage=0.0,
        tier_cap_penalty=0.0,
        line_breakdowns=[],
        required_approval_role=None,
        governance_explanation="Low risk quote within authorized limits",
    )
    service.risk_service.calculate_blended_score = AsyncMock(return_value=mock_brs_low)

    negotiate_payload = QuotationNegotiationRequest(
        line_changes=[
            NegotiationLineChange(
                line_id=quote.lines[0].id,
                new_discount=8.0,
                new_quantity=5,
            )
        ],
        counter_offer_notes="Can you match 8% for immediate signoff?",
    )

    result = await service.negotiate_quotation(
        quotation_id=quote.id,
        customer_id=customer_id,
        negotiation_in=negotiate_payload,
        customer_tier="gold",
    )

    assert result.requires_approval is False
    assert result.quotation_status == QuotationStatus.APPROVED
    assert result.governance_action == "counter_offer_accepted"
    assert "LOW RISK" in result.governance_explanation
    assert result.new_total == round(5 * 1000.0 * 0.92, 2)


@mark_asyncio
async def test_negotiation_counter_offer_high_risk_reroutes_to_approval():
    """
    Test that an aggressive customer counter-offer exceeding tier limits recalculates BRS,
    changes status to 'pending_approval', and generates sequential approval requests.
    """
    customer_id = uuid.uuid4()
    rep_id = uuid.uuid4()
    quote = setup_mock_quotation(customer_id=customer_id, sales_rep_id=rep_id, discount=5.0)

    mock_session = AsyncMock()
    service = CustomerPortalService(mock_session)
    service.quotation_repo.get_by_id = AsyncMock(return_value=quote)

    # Mock high-risk BRS result (score: 18.5, High Risk -> requires sales_manager + finance)
    mock_brs_high = BRSCalculationResponse(
        quotation_id=quote.id,
        score=18.5,
        risk_level=RiskLevel.HIGH,
        total_discount_percent=25.0,
        overall_tier_cap_percent=15.0,
        tier_cap_overage=10.0,
        tier_cap_penalty=10.0,
        line_breakdowns=[],
        required_approval_role="Sales Manager & Finance Director",
        governance_explanation="High risk quote exceeds Gold tier maximum discount",
    )
    service.risk_service.calculate_blended_score = AsyncMock(return_value=mock_brs_high)
    service.approval_service.route_for_approval = AsyncMock()

    negotiate_payload = QuotationNegotiationRequest(
        line_changes=[
            NegotiationLineChange(
                line_id=quote.lines[0].id,
                new_discount=25.0,
                new_quantity=10,
            )
        ],
        counter_offer_notes="Requesting 25% discount for bulk enterprise deployment",
    )

    result = await service.negotiate_quotation(
        quotation_id=quote.id,
        customer_id=customer_id,
        negotiation_in=negotiate_payload,
        customer_tier="gold",
    )

    # Verifications
    assert result.requires_approval is True
    assert result.quotation_status == QuotationStatus.PENDING_APPROVAL
    assert result.governance_action == "re_routed_for_approval"
    assert "HIGH RISK" in result.governance_explanation
    service.approval_service.route_for_approval.assert_awaited_once_with(
        quotation_id=quote.id,
        customer_tier="gold",
    )


@mark_asyncio
async def test_customer_confirm_approved_quotation_creates_order():
    """
    Test that confirming an approved quotation creates an Order and itemized OrderLines.
    """
    customer_id = uuid.uuid4()
    rep_id = uuid.uuid4()
    quote = setup_mock_quotation(
        customer_id=customer_id,
        sales_rep_id=rep_id,
        initial_status=QuotationStatus.APPROVED,
    )

    mock_session = AsyncMock()
    service = CustomerPortalService(mock_session)
    service.quotation_repo.get_by_id = AsyncMock(return_value=quote)

    created_orders = []

    async def mock_create_order(order: Order):
        created_orders.append(order)
        order.lines = [
            OrderLine(
                id=uuid.uuid4(),
                order_id=order.id,
                product_id=quote.lines[0].product_id,
                product=quote.lines[0].product,
                quantity=quote.lines[0].quantity,
                unit_price=quote.lines[0].unit_price,
                discount_percent=quote.lines[0].discount_percent,
                line_total=quote.lines[0].line_total,
                margin_percent=quote.lines[0].margin_percent,
            )
        ]
        return order

    service.order_repo.create_order = AsyncMock(side_effect=mock_create_order)
    service.billing_service.generate_order_billing = AsyncMock()
    service.warehouse_splitter.suggest_split = AsyncMock()

    order_resp = await service.confirm_quotation(
        quotation_id=quote.id,
        customer_id=customer_id,
    )

    assert order_resp.status == OrderStatus.PENDING
    assert order_resp.customer_id == customer_id
    assert order_resp.quotation_id == quote.id
    assert order_resp.total_amount == quote.total_amount
    assert len(order_resp.lines) == 1
    assert quote.status == QuotationStatus.CONFIRMED


@mark_asyncio
async def test_customer_confirm_pending_approval_quotation_rejected():
    """
    Test that attempting to confirm a quotation in 'pending_approval' status is rejected.
    """
    customer_id = uuid.uuid4()
    rep_id = uuid.uuid4()
    quote = setup_mock_quotation(
        customer_id=customer_id,
        sales_rep_id=rep_id,
        initial_status=QuotationStatus.PENDING_APPROVAL,
    )

    mock_session = AsyncMock()
    service = CustomerPortalService(mock_session)
    service.quotation_repo.get_by_id = AsyncMock(return_value=quote)

    with pytest.raises(HTTPException) as exc_info:
        await service.confirm_quotation(
            quotation_id=quote.id,
            customer_id=customer_id,
        )

    assert exc_info.value.status_code == 400
    assert "pending management approval" in exc_info.value.detail


if __name__ == "__main__":
    import asyncio
    print("Running Customer Portal Negotiation Integration Tests...")
    asyncio.run(test_customer_quotation_security_isolation())
    print("✔ test_customer_quotation_security_isolation passed")
    asyncio.run(test_negotiation_counter_offer_low_risk_auto_approved())
    print("✔ test_negotiation_counter_offer_low_risk_auto_approved passed")
    asyncio.run(test_negotiation_counter_offer_high_risk_reroutes_to_approval())
    print("✔ test_negotiation_counter_offer_high_risk_reroutes_to_approval passed")
    asyncio.run(test_customer_confirm_approved_quotation_creates_order())
    print("✔ test_customer_confirm_approved_quotation_creates_order passed")
    asyncio.run(test_customer_confirm_pending_approval_quotation_rejected())
    print("✔ test_customer_confirm_pending_approval_quotation_rejected passed")
    print("ALL CUSTOMER PORTAL INTEGRATION TESTS PASSED SUCCESSFULLY!")
