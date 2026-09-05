import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

try:
    import pytest
    mark_asyncio = pytest.mark.asyncio
except ImportError:
    def mark_asyncio(func):
        return func

from app.services.proration_service import ProrationService


@mark_asyncio
async def test_proration_mid_month_seat_upgrade():
    """
    Unit Test Scenario:
    Customer upgrades subscription from 5 to 10 seats exactly mid-month (15 days remaining in a 30-day billing cycle).
    Unit price = $100/seat/month.
    
    Calculation:
    - total_days = 30
    - days_remaining = 15
    - fraction_remaining = 15/30 = 0.5 (50%)
    - delta_quantity = +5 seats
    - prorated charge = 5 seats * $100/seat * 0.5 = $250.00
    - adjustment_type = "debit"
    """
    cycle_start = datetime(2026, 9, 1, 0, 0, 0)
    current_date = datetime(2026, 9, 16, 0, 0, 0)
    next_billing = datetime(2026, 10, 1, 0, 0, 0)

    result = await ProrationService.calculate_prorated_adjustment(
        old_quantity=5,
        new_quantity=10,
        current_date=current_date,
        next_billing_date=next_billing,
        cycle_start_date=cycle_start,
        unit_price_per_cycle=100.0,
    )

    assert result.total_days_in_cycle == 30
    assert result.days_remaining == 15
    assert result.fraction_remaining == 0.5
    assert result.delta_quantity == 5
    assert result.prorated_amount == 250.00
    assert result.adjustment_type == "debit"
    assert "$250.00" in result.explanation


@mark_asyncio
async def test_proration_mid_month_seat_downgrade():
    """
    Unit Test Scenario:
    Customer downgrades from 10 to 4 seats mid-month.
    - delta_quantity = -6 seats
    - fraction_remaining = 0.5
    - prorated credit = 6 * $100 * 0.5 = $300.00
    - adjustment_type = "credit"
    """
    cycle_start = datetime(2026, 9, 1, 0, 0, 0)
    current_date = datetime(2026, 9, 16, 0, 0, 0)
    next_billing = datetime(2026, 10, 1, 0, 0, 0)

    result = await ProrationService.calculate_prorated_adjustment(
        old_quantity=10,
        new_quantity=4,
        current_date=current_date,
        next_billing_date=next_billing,
        cycle_start_date=cycle_start,
        unit_price_per_cycle=100.0,
    )

    assert result.delta_quantity == -6
    assert result.prorated_amount == 300.00
    assert result.adjustment_type == "credit"
    assert "$300.00" in result.explanation


@mark_asyncio
async def test_proration_idempotency():
    """
    Verify that calling proration with an idempotency key guarantees deterministic, idempotent responses.
    """
    cycle_start = datetime(2026, 9, 1, 0, 0, 0)
    current_date = datetime(2026, 9, 16, 0, 0, 0)
    next_billing = datetime(2026, 10, 1, 0, 0, 0)
    idempotency_key = "test_sub_upgrade_tx_9981"

    res1 = await ProrationService.calculate_prorated_adjustment(
        old_quantity=5,
        new_quantity=10,
        current_date=current_date,
        next_billing_date=next_billing,
        cycle_start_date=cycle_start,
        unit_price_per_cycle=100.0,
        idempotency_key=idempotency_key,
    )

    res2 = await ProrationService.calculate_prorated_adjustment(
        old_quantity=5,
        new_quantity=10,
        current_date=current_date,
        next_billing_date=next_billing,
        cycle_start_date=cycle_start,
        unit_price_per_cycle=100.0,
        idempotency_key=idempotency_key,
    )

    assert res1.prorated_amount == res2.prorated_amount
    assert res1.adjustment_type == res2.adjustment_type
    assert res1.delta_quantity == res2.delta_quantity


if __name__ == "__main__":
    import asyncio
    print("Running Proration Unit Tests...")
    asyncio.run(test_proration_mid_month_seat_upgrade())
    print("✔ test_proration_mid_month_seat_upgrade passed")
    asyncio.run(test_proration_mid_month_seat_downgrade())
    print("✔ test_proration_mid_month_seat_downgrade passed")
    asyncio.run(test_proration_idempotency())
    print("✔ test_proration_idempotency passed")
    print("ALL PRORATION TESTS PASSED SUCCESSFULLY!")

