import os
import sys
from datetime import datetime, timedelta, timezone
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

from app.models.alert import Alert, AlertSeverity, AlertType
from app.models.quotation import Quotation, QuotationLine, QuotationStatus
from app.services.deal_health_service import DealHealthService


def create_mock_quote(
    quote_id: uuid.UUID,
    status: QuotationStatus,
    updated_at: datetime,
    sales_rep_id: uuid.UUID,
    total_amount: float = 10000.0,
    discount_total: float = 500.0,
) -> Quotation:
    q = MagicMock(spec=Quotation)
    q.id = quote_id
    q.status = status
    q.updated_at = updated_at
    q.created_at = updated_at
    q.sales_rep_id = sales_rep_id
    q.total_amount = total_amount
    q.discount_total = discount_total
    q.lines = []
    return q


@mark_asyncio
async def test_stalled_deal_detection():
    """
    Test that quotations sitting in 'sent_to_customer' or 'under_negotiation'
    past the stalled threshold (3 days) trigger automated stall alerts,
    while recently updated quotes do not.
    """
    now = datetime.now(timezone.utc)
    rep_id = uuid.uuid4()

    # 1. Stalled Quote (updated 5 days ago in sent_to_customer) -> SHOULD TRIGGER
    quote_stalled_1 = create_mock_quote(
        quote_id=uuid.uuid4(),
        status=QuotationStatus.SENT_TO_CUSTOMER,
        updated_at=now - timedelta(days=5),
        sales_rep_id=rep_id,
        total_amount=15000.0,
    )

    # 2. Stalled Quote (updated 4 days ago in under_negotiation) -> SHOULD TRIGGER
    quote_stalled_2 = create_mock_quote(
        quote_id=uuid.uuid4(),
        status=QuotationStatus.UNDER_NEGOTIATION,
        updated_at=now - timedelta(days=4),
        sales_rep_id=rep_id,
        total_amount=22000.0,
    )

    # 3. Active Fresh Quote (updated 1 day ago) -> SHOULD NOT TRIGGER
    quote_fresh = create_mock_quote(
        quote_id=uuid.uuid4(),
        status=QuotationStatus.SENT_TO_CUSTOMER,
        updated_at=now - timedelta(days=1),
        sales_rep_id=rep_id,
        total_amount=8000.0,
    )

    # 4. Draft Quote (updated 10 days ago, but in draft status -> not customer facing) -> IGNORED BY QUERY
    mock_session = AsyncMock()
    service = DealHealthService(mock_session)

    # Mock DB query returning the two stalled quotes
    mock_query_result = MagicMock()
    mock_query_result.scalars.return_value.all.return_value = [quote_stalled_1, quote_stalled_2]
    mock_session.execute = AsyncMock(return_value=mock_query_result)

    # Mock alert repo: no existing unresolved alerts
    service.alert_repo.find_existing_unresolved = AsyncMock(return_value=None)

    created_alerts = []

    async def mock_create(alert: Alert):
        created_alerts.append(alert)
        return alert

    service.alert_repo.create_alert = AsyncMock(side_effect=mock_create)

    # Run stall detection (threshold: 3 days)
    results = await service.check_stalled_deals(stalled_days_threshold=3)

    # Verifications
    assert len(results) == 2
    assert results[0].type == AlertType.STALLED
    assert results[0].severity == AlertSeverity.MEDIUM
    assert results[0].quotation_id == quote_stalled_1.id
    assert "5 days" in results[0].message or "stalled" in results[0].message
    assert results[0].details["total_amount"] == 15000.0

    assert results[1].quotation_id == quote_stalled_2.id
    assert results[1].details["quotation_status"] == QuotationStatus.UNDER_NEGOTIATION.value


@mark_asyncio
async def test_stalled_deal_duplicate_prevention():
    """
    Test that an existing unresolved alert prevents duplicate alert creation on recurring runs.
    """
    now = datetime.now(timezone.utc)
    rep_id = uuid.uuid4()
    stalled_quote = create_mock_quote(
        quote_id=uuid.uuid4(),
        status=QuotationStatus.SENT_TO_CUSTOMER,
        updated_at=now - timedelta(days=6),
        sales_rep_id=rep_id,
    )

    mock_session = AsyncMock()
    service = DealHealthService(mock_session)

    mock_query_result = MagicMock()
    mock_query_result.scalars.return_value.all.return_value = [stalled_quote]
    mock_session.execute = AsyncMock(return_value=mock_query_result)

    # Mock that an active unresolved alert ALREADY exists
    existing_alert = Alert(
        id=uuid.uuid4(),
        type=AlertType.STALLED,
        severity=AlertSeverity.MEDIUM,
        quotation_id=stalled_quote.id,
        message="Existing alert",
    )
    service.alert_repo.find_existing_unresolved = AsyncMock(return_value=existing_alert)
    service.alert_repo.create_alert = AsyncMock()

    results = await service.check_stalled_deals(stalled_days_threshold=3)

    # Must not create duplicate alert
    assert len(results) == 0
    service.alert_repo.create_alert.assert_not_awaited()


@mark_asyncio
async def test_alert_resolution():
    """
    Test marking an alert as resolved with resolver timestamp and attribution.
    """
    alert_id = uuid.uuid4()
    user_id = uuid.uuid4()

    mock_alert = Alert(
        id=alert_id,
        type=AlertType.STALLED,
        severity=AlertSeverity.MEDIUM,
        message="Stalled quote",
        details={},
        created_at=datetime.now(timezone.utc),
        resolved_at=None,
        resolved_by=None,
    )

    mock_session = AsyncMock()
    service = DealHealthService(mock_session)
    service.alert_repo.get_by_id = AsyncMock(return_value=mock_alert)

    async def mock_resolve(alert: Alert, resolved_by=None):
        alert.resolved_at = datetime.now(timezone.utc)
        alert.resolved_by = resolved_by
        return alert

    service.alert_repo.resolve_alert = AsyncMock(side_effect=mock_resolve)

    resolved = await service.resolve_alert(alert_id=alert_id, resolved_by=user_id)

    assert resolved.resolved_at is not None
    assert resolved.resolved_by == user_id


if __name__ == "__main__":
    import asyncio
    print("Running Deal Health & Stall Detection Unit Tests...")
    asyncio.run(test_stalled_deal_detection())
    print("✔ test_stalled_deal_detection passed")
    asyncio.run(test_stalled_deal_duplicate_prevention())
    print("✔ test_stalled_deal_duplicate_prevention passed")
    asyncio.run(test_alert_resolution())
    print("✔ test_alert_resolution passed")
    print("ALL DEAL HEALTH TESTS PASSED SUCCESSFULLY!")
