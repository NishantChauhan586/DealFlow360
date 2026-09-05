import uuid
from fastapi import HTTPException
import pytest

from app.models.quotation import Quotation, QuotationLine, QuotationStatus
from app.services.quotation_service import (
    QuotationService,
    compute_line_total,
    compute_margin,
)


def test_compute_line_total():
    # 5 units @ $200 with 10% discount = $900 total, $100 discount
    line_total, discount_amt = compute_line_total(
        unit_price=200.0, quantity=5, discount_percent=10.0
    )
    assert line_total == 900.0
    assert discount_amt == 100.0

    # 1 unit @ $14999 with 0% discount
    line_total, discount_amt = compute_line_total(
        unit_price=14999.0, quantity=1, discount_percent=0.0
    )
    assert line_total == 14999.0
    assert discount_amt == 0.0


def test_compute_margin():
    # Unit price 1000, 10% discount -> selling price 900, default cost 500 -> margin = (900-500)/900 = 44.44%
    margin = compute_margin(unit_price=1000.0, discount_percent=10.0)
    assert margin == 44.44

    # Explicit cost price 400
    margin_explicit = compute_margin(
        unit_price=1000.0, discount_percent=10.0, cost_price=400.0
    )
    assert margin_explicit == 55.56


def test_quotation_editable_validation():
    service = QuotationService(session=None)  # type: ignore

    # Draft quotation -> passes validation
    draft_quote = Quotation(
        id=uuid.uuid4(),
        customer_id=uuid.uuid4(),
        sales_rep_id=uuid.uuid4(),
        status=QuotationStatus.DRAFT,
    )
    # Should not raise exception
    service._validate_editable(draft_quote)

    # Approved quotation -> fails validation
    approved_quote = Quotation(
        id=uuid.uuid4(),
        customer_id=uuid.uuid4(),
        sales_rep_id=uuid.uuid4(),
        status=QuotationStatus.APPROVED,
    )
    with pytest.raises(HTTPException) as exc_info:
        service._validate_editable(approved_quote)
    assert exc_info.value.status_code == 400
    assert "cannot be modified" in exc_info.value.detail


def test_quotation_recalculate_totals():
    service = QuotationService(session=None)  # type: ignore

    quote = Quotation(
        id=uuid.uuid4(),
        customer_id=uuid.uuid4(),
        sales_rep_id=uuid.uuid4(),
        status=QuotationStatus.DRAFT,
    )

    line1 = QuotationLine(
        id=uuid.uuid4(),
        quotation_id=quote.id,
        product_id=uuid.uuid4(),
        quantity=2,
        unit_price=1000.0,
        discount_percent=10.0,
        line_total=1800.0,  # 2000 - 200
        margin_percent=44.44,
    )

    line2 = QuotationLine(
        id=uuid.uuid4(),
        quotation_id=quote.id,
        product_id=uuid.uuid4(),
        quantity=1,
        unit_price=500.0,
        discount_percent=0.0,
        line_total=500.0,
        margin_percent=50.0,
    )

    quote.lines = [line1, line2]
    service._recalculate_totals(quote)

    assert quote.total_amount == 2300.0
    assert quote.discount_total == 200.0
