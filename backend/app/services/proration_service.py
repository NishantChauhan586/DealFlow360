from dataclasses import dataclass
from datetime import datetime
from typing import Optional
import structlog
from app.utils.idempotency import idempotency_store

logger = structlog.get_logger(__name__)


@dataclass
class ProrationResult:
    total_days_in_cycle: int
    days_remaining: int
    fraction_remaining: float
    delta_quantity: int
    prorated_amount: float
    adjustment_type: str  # "debit" | "credit" | "none"
    explanation: str


class ProrationService:
    """
    Financial proration engine using the daily proportional calculation method.
    Guarantees mathematical correctness and idempotent billing adjustments.
    """

    @staticmethod
    async def calculate_prorated_adjustment(
        old_quantity: int,
        new_quantity: int,
        current_date: datetime,
        next_billing_date: datetime,
        cycle_start_date: datetime,
        unit_price_per_cycle: float,
        idempotency_key: Optional[str] = None,
    ) -> ProrationResult:
        """
        Daily Proportional Proration Formula:
        - total_days = (next_billing_date - cycle_start_date).days
        - days_remaining = (next_billing_date - current_date).days
        - fraction_remaining = days_remaining / total_days
        - delta_quantity = new_quantity - old_quantity
        - prorated_amount = delta_quantity * unit_price_per_cycle * fraction_remaining
        """
        # Idempotency check if key is provided
        if idempotency_key:
            cached = await idempotency_store.get_response(f"proration:{idempotency_key}")
            if cached:
                logger.info("proration_idempotency_hit", key=idempotency_key)
                return ProrationResult(**cached)

        # Date normalization
        c_date = current_date.date() if hasattr(current_date, "date") else current_date
        n_date = next_billing_date.date() if hasattr(next_billing_date, "date") else next_billing_date
        s_date = cycle_start_date.date() if hasattr(cycle_start_date, "date") else cycle_start_date

        total_days = max(1, (n_date - s_date).days)
        days_remaining = max(0, min(total_days, (n_date - c_date).days))
        fraction_remaining = round(days_remaining / total_days, 6)

        delta_qty = new_quantity - old_quantity
        raw_prorated = delta_qty * unit_price_per_cycle * fraction_remaining
        prorated_amount = round(raw_prorated, 2)

        if delta_qty > 0:
            adjustment_type = "debit"
            explanation = (
                f"Subscription upgrade (+{delta_qty} seats). "
                f"{days_remaining}/{total_days} days remaining in cycle ({fraction_remaining * 100:.1f}%). "
                f"Prorated charge: ${abs(prorated_amount):.2f}."
            )
        elif delta_qty < 0:
            adjustment_type = "credit"
            explanation = (
                f"Subscription downgrade ({delta_qty} seats). "
                f"{days_remaining}/{total_days} days remaining in cycle ({fraction_remaining * 100:.1f}%). "
                f"Prorated credit note: ${abs(prorated_amount):.2f}."
            )
        else:
            adjustment_type = "none"
            explanation = "No seat quantity change. Prorated amount is $0.00."

        result = ProrationResult(
            total_days_in_cycle=total_days,
            days_remaining=days_remaining,
            fraction_remaining=fraction_remaining,
            delta_quantity=delta_qty,
            prorated_amount=abs(prorated_amount),
            adjustment_type=adjustment_type,
            explanation=explanation,
        )

        if idempotency_key:
            await idempotency_store.save_response(
                f"proration:{idempotency_key}",
                result.__dict__,
            )

        logger.info(
            "proration_computed",
            old_qty=old_quantity,
            new_qty=new_quantity,
            days_rem=days_remaining,
            total_days=total_days,
            prorated=prorated_amount,
            type=adjustment_type,
        )

        return result
