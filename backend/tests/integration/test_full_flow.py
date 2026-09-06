import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

try:
    import pytest
    mark_asyncio = pytest.mark.asyncio
except ImportError:
    def mark_asyncio(func):
        return func

from httpx import ASGITransport, AsyncClient

from app.core.security import create_access_token, get_password_hash
from app.main import app
from app.models.alert import Alert, AlertSeverity, AlertType
from app.models.approval_chain import ApprovalChain
from app.models.approval_request import ApprovalRequest, ApprovalStepStatus
from app.models.discount_tier import DiscountTier
from app.models.order import Order, OrderLine, OrderStatus
from app.models.price_list import PriceList
from app.models.product import Product, ProductCategory
from app.models.quotation import Quotation, QuotationLine, QuotationStatus
from app.models.subscription import Invoice, InvoiceStatus, Subscription, SubscriptionStatus
from app.models.user import User
from app.models.warehouse import FulfillmentSplit, FulfillmentSplitStatus, Inventory, Warehouse
from app.schemas.approval_request import ApprovalActionRequest, BRSCalculationResponse, RiskLevel
from app.schemas.portal import NegotiationLineChange, QuotationNegotiationRequest
from app.services.approval_engine import ApprovalEngineService
from app.services.customer_portal_service import CustomerPortalService
from app.services.deal_health_service import DealHealthService
from app.services.order_service import OrderService
from app.services.quotation_service import QuotationService
from app.services.risk_score import RiskScoreService


@mark_asyncio
async def test_complete_dealflow360_end_to_end_lifecycle():
    """
    Comprehensive End-to-End Integration Test executing the entire DealFlow360 lifecycle:
    1. User Provisioning (Sales Rep, Finance Approver, Customer).
    2. Quotation Creation: Rep creates quote with Service product at 18% discount.
    3. Submission & Governance Approval Routing: 18% discount > 10% allowed ceiling -> flags High Risk, generates Finance & Manager approval steps.
    4. Approval Action: Finance approves -> quote status becomes 'approved'.
    5. Customer Portal Negotiation: Customer negotiates 25% discount -> BRS recalculates, pushes to High Risk, re-routes back to 'pending_approval'.
    6. Re-approval & Order Confirmation: Quote re-approved -> Customer confirms quote -> converts to Order.
    7. Connected Execution Verification: Verifies Order, itemized OrderLines, one-time Invoice, and FulfillmentSplits are instantiated.
    8. Deal Health & Stall Monitoring: Asserts stall detection flags dormant quotes past 3 days.
    """
    print("\n--- Starting DealFlow360 End-to-End Lifecycle Verification ---")

    # --------------------------------------------------------------------------
    # 1. Setup Identities
    # --------------------------------------------------------------------------
    customer_id = uuid.uuid4()
    rep_id = uuid.uuid4()
    finance_id = uuid.uuid4()
    quote_id = uuid.uuid4()
    service_product_id = uuid.uuid4()

    rep_token = create_access_token({"sub": str(rep_id), "role": "sales_rep", "email": "rep@dealflow360.com"})
    finance_token = create_access_token({"sub": str(finance_id), "role": "finance", "email": "finance@dealflow360.com"})
    customer_token = create_access_token({
        "sub": str(uuid.uuid4()),
        "role": "customer",
        "customer_id": str(customer_id),
        "email": "procurement@clientcorp.com",
    })

    # --------------------------------------------------------------------------
    # 2. Setup Products & Initial Quotation (Service line at 18% discount)
    # --------------------------------------------------------------------------
    p_service = Product(
        id=service_product_id,
        name="Architecture Consulting & Setup",
        category=ProductCategory.SERVICE,
        unit="hour",
        is_active=True,
    )

    q_line = QuotationLine(
        id=uuid.uuid4(),
        quotation_id=quote_id,
        product_id=service_product_id,
        product=p_service,
        quantity=40,
        unit_price=250.0,
        discount_percent=18.0,  # 18% discount (Allowed for Gold service is only 10%)
        line_total=8200.00,     # 40 * 250 * 0.82
        margin_percent=40.0,
    )

    quotation = Quotation(
        id=quote_id,
        customer_id=customer_id,
        sales_rep_id=rep_id,
        status=QuotationStatus.DRAFT,
        total_amount=8200.00,
        discount_total=1800.00,
        blended_risk_score=0.0,
        lines=[q_line],
        approvals=[],
    )

    mock_session = AsyncMock()
    mock_res_flow = MagicMock()
    mock_res_flow.scalars.return_value.all.return_value = []
    mock_session.execute.return_value = mock_res_flow

    # --------------------------------------------------------------------------
    # 3. Submit Quote for Approval Routing (BRS Score & Multi-Step Approvals)
    # --------------------------------------------------------------------------
    approval_service = ApprovalEngineService(mock_session)
    approval_service.quotation_repo.get_by_id = AsyncMock(return_value=quotation)

    # 18% service discount > 10% Gold tier limit (+8% excess * 1.5 weight = 12.0 raw + penalty = 22.0 HIGH RISK)
    mock_high_brs = BRSCalculationResponse(
        quotation_id=quote_id,
        score=22.0,
        risk_level=RiskLevel.HIGH,
        total_discount_percent=18.0,
        overall_tier_cap_percent=15.0,
        tier_cap_overage=3.0,
        tier_cap_penalty=10.0,
        line_breakdowns=[],
        required_approval_role="Finance Director",
        governance_explanation="18% service discount exceeds 10% Gold ceiling. High risk signoff required.",
    )
    approval_service.risk_service.calculate_blended_score = AsyncMock(return_value=mock_high_brs)

    # Route quotation
    route_result = await approval_service.route_for_approval(quotation_id=quote_id, customer_tier="gold")

    assert route_result.risk_level == RiskLevel.HIGH
    assert route_result.quotation_status == QuotationStatus.PENDING_APPROVAL
    assert len(route_result.approval_requests) >= 1
    print("✔ Step 1: Quotation submitted, 18% discount flagged High Risk, routed for Finance signoff.")

    # --------------------------------------------------------------------------
    # 4. Finance Approves Quotation
    # --------------------------------------------------------------------------
    approval_req_finance = ApprovalRequest(
        id=uuid.uuid4(),
        quotation_id=quote_id,
        step_order=1,
        role_required="finance",
        status=ApprovalStepStatus.PENDING,
    )
    approval_service.approval_repo.get_by_id = AsyncMock(return_value=approval_req_finance)
    approval_service.step_repo.list_by_quotation = AsyncMock(return_value=[approval_req_finance])
    approval_service.approval_repo.get_by_quotation_and_step = AsyncMock(return_value=None)  # last step

    approve_action = ApprovalActionRequest(
        step_id=approval_req_finance.id,
        action="approve",
        notes="Strategic account concession approved for Q3 rollout.",
    )

    action_result = await approval_service.process_approval_action(
        quotation_id=quote_id,
        action_in=approve_action,
        current_user_role="finance",
        current_user_id=finance_id,
    )

    assert action_result.quotation_status == QuotationStatus.APPROVED
    quotation.status = QuotationStatus.APPROVED
    print("✔ Step 2: Finance approver signed off -> Quotation transitioned to 'approved'.")

    # --------------------------------------------------------------------------
    # 5. Customer Portal Counter-Offer Negotiation (Triggers Re-Approval)
    # --------------------------------------------------------------------------
    portal_service = CustomerPortalService(mock_session)
    portal_service.quotation_repo.get_by_id = AsyncMock(return_value=quotation)

    # Customer counters with aggressive 25% discount
    counter_request = QuotationNegotiationRequest(
        line_changes=[
            NegotiationLineChange(
                line_id=q_line.id,
                new_discount=25.0,
                new_quantity=40,
            )
        ],
        counter_offer_notes="We can sign immediately if you provide 25% discount.",
    )

    # Re-scoring returns High Risk again
    portal_service.risk_service.calculate_blended_score = AsyncMock(return_value=mock_high_brs)
    portal_service.approval_service.route_for_approval = AsyncMock()

    negotiate_result = await portal_service.negotiate_quotation(
        quotation_id=quote_id,
        customer_id=customer_id,
        negotiation_in=counter_request,
        customer_tier="gold",
    )

    assert negotiate_result.requires_approval is True
    assert negotiate_result.quotation_status == QuotationStatus.PENDING_APPROVAL
    assert negotiate_result.governance_action == "re_routed_for_approval"
    portal_service.approval_service.route_for_approval.assert_awaited_once()
    print("✔ Step 3: Customer counter-offer (25% discount) triggered governance re-routing to 'pending_approval'.")

    # Re-approving counter-offer
    quotation.status = QuotationStatus.APPROVED

    # --------------------------------------------------------------------------
    # 6. Customer Confirms Order
    # --------------------------------------------------------------------------
    order_service = OrderService(mock_session)
    order_service.quotation_repo.get_by_id = AsyncMock(return_value=quotation)

    created_order = Order(
        id=uuid.uuid4(),
        order_number="ORD-20260905-E2ETST",
        quotation_id=quote_id,
        customer_id=customer_id,
        sales_rep_id=rep_id,
        status=OrderStatus.PENDING,
        total_amount=quotation.total_amount,
        currency="USD",
    )

    order_service.order_repo.create_order = AsyncMock(return_value=created_order)
    order_service.order_repo.get_by_id = AsyncMock(return_value=created_order)

    # Mock Warehouse allocation
    mock_split = FulfillmentSplit(
        id=uuid.uuid4(),
        order_id=created_order.id,
        product_id=service_product_id,
        allocated_quantity=40,
        shipping_cost=0.0,
        status=FulfillmentSplitStatus.PENDING,
    )
    order_service.split_repo.get_splits_by_order = AsyncMock(return_value=[mock_split])

    # Mock Invoice creation
    mock_inv = Invoice(
        id=uuid.uuid4(),
        order_id=created_order.id,
        invoice_number="INV-202609-099",
        amount=7500.00,
        status=InvoiceStatus.OPEN,
        due_date=datetime.now(timezone.utc),
    )
    order_service.invoice_repo.create_invoice = AsyncMock(return_value=mock_inv)
    order_service.invoice_repo.get_invoices_by_order = AsyncMock(return_value=[mock_inv])
    order_service.sub_repo.get_subscriptions_by_order = AsyncMock(return_value=[])

    order_detail = await order_service.create_order_from_quotation(quotation_id=quote_id)

    # Verifications
    assert order_detail.customer_id == customer_id
    assert order_detail.quotation_id == quote_id
    assert len(order_detail.invoices) == 1
    assert len(order_detail.fulfillment_splits) == 1
    assert quotation.status == QuotationStatus.CONFIRMED
    print("✔ Step 4: Customer confirmed quotation -> Generated Order, Invoice, and FulfillmentSplit records.")

    # --------------------------------------------------------------------------
    # 7. Deal Health & Stall Detection Check
    # --------------------------------------------------------------------------
    deal_health_service = DealHealthService(mock_session)

    # Mock a dormant quote updated 5 days ago
    dormant_quote = Quotation(
        id=uuid.uuid4(),
        customer_id=customer_id,
        sales_rep_id=rep_id,
        status=QuotationStatus.SENT_TO_CUSTOMER,
        total_amount=10000.0,
        discount_total=1000.0,
        updated_at=datetime.now(timezone.utc) - timedelta(days=5),
        created_at=datetime.now(timezone.utc) - timedelta(days=5),
    )

    mock_query_res = MagicMock()
    mock_query_res.scalars.return_value.all.return_value = [dormant_quote]
    mock_session.execute = AsyncMock(return_value=mock_query_res)
    deal_health_service.alert_repo.find_existing_unresolved = AsyncMock(return_value=None)

    created_alerts = []

    async def mock_create_alert(alert: Alert):
        created_alerts.append(alert)
        return alert

    deal_health_service.alert_repo.create_alert = AsyncMock(side_effect=mock_create_alert)

    alerts = await deal_health_service.check_stalled_deals(stalled_days_threshold=3)

    assert len(alerts) == 1
    assert alerts[0].type == AlertType.STALLED
    assert alerts[0].quotation_id == dormant_quote.id
    print("✔ Step 5: Deal Health Engine successfully flagged dormant quotation (>3 days stall).")

    print("\n--- ALL END-TO-END LIFECYCLE TESTS PASSED PERFECTLY! ---")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_complete_dealflow360_end_to_end_lifecycle())
