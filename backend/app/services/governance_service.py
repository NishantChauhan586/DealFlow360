from typing import List, Dict, Any, Tuple
from app.schemas.quote import GovernanceExplanation


CATEGORY_CEILINGS: Dict[str, float] = {
    "Hardware": 15.0,
    "Services": 10.0,
    "Subscription": 12.0,
}


def calculate_line_item_governance(
    category: str,
    unit_price: float,
    unit_cost: float,
    quantity: int,
    discount_percent: float,
) -> Tuple[float, float, bool, float]:
    """
    Evaluates line item financials and discount ceiling rules deterministically.
    Returns: (line_total, ceiling_percent, ceiling_breached, overage_percent)
    """
    qty = max(1, quantity)
    price = max(0.0, unit_price)
    cost = max(0.0, unit_cost)
    disc = min(100.0, max(0.0, discount_percent))

    subtotal = qty * price
    discount_amount = (subtotal * disc) / 100.0
    line_total = round(subtotal - discount_amount, 2)

    ceiling = CATEGORY_CEILINGS.get(category, 15.0)
    overage = max(0.0, disc - ceiling)
    breached = overage > 0.001

    return line_total, ceiling, breached, round(overage, 2)


def evaluate_quote_governance(
    line_items: List[Dict[str, Any]],
    overall_discount: float = 0.0,
) -> Dict[str, Any]:
    """
    Evaluates the entire quotation commercial governance:
    - Subtotal, Discount Amount, Tax (10%), Grand Total
    - Blended Gross Margin %
    - Max Overage Delta
    - Risk Score (0-100) & Risk Level ('Low', 'Medium', 'High')
    - Required Approval Tier ('Sales Rep', 'Sales Manager', 'VP of Sales', 'CFO')
    - Explainability Decision object (WHAT, WHY, WHAT NEXT)
    """
    processed_items = []
    total_cost = 0.0
    subtotal = 0.0
    max_overage = 0.0
    breached_lines = []

    for item in line_items:
        category = item.get("category", "Hardware")
        qty = max(1, int(item.get("quantity", 1)))
        price = float(item.get("unit_price", 0.0))
        cost = float(item.get("unit_cost", 0.0))
        item_disc = float(item.get("discount_percent", 0.0))

        line_total, ceiling, breached, overage = calculate_line_item_governance(
            category, price, cost, qty, item_disc
        )

        subtotal += line_total
        total_cost += qty * cost

        if breached:
            breached_lines.append({
                "name": item.get("name", "Line Item"),
                "category": category,
                "discount": item_disc,
                "ceiling": ceiling,
                "overage": overage,
            })
            if overage > max_overage:
                max_overage = overage

        processed_items.append({
            "name": item.get("name", ""),
            "category": category,
            "quantity": qty,
            "unit_price": price,
            "unit_cost": cost,
            "discount_percent": item_disc,
            "line_total": line_total,
            "ceiling_percent": ceiling,
            "ceiling_breached": breached,
            "overage_percent": overage,
            "product_id": item.get("product_id"),
        })

    # Blended quote-level discount
    overall_disc = min(100.0, max(0.0, float(overall_discount)))
    discount_amount = round((subtotal * overall_disc) / 100.0, 2)
    taxable = max(0.0, subtotal - discount_amount)
    tax = round(taxable * 0.10, 2)
    grand_total = round(taxable + tax, 2)

    # Blended Margin %
    effective_revenue = max(0.01, taxable)
    gross_margin_amount = effective_revenue - total_cost
    blended_margin_pct = round((gross_margin_amount / effective_revenue) * 100.0, 2)

    # Risk Score & Approval Tier Routing
    risk_score = 0
    if max_overage > 0:
        risk_score += min(50, int(max_overage * 2.5))
    if blended_margin_pct < 30.0:
        risk_score += int((30.0 - blended_margin_pct) * 1.5)
    if blended_margin_pct < 15.0:
        risk_score += 25

    risk_score = min(100, max(0, risk_score))

    if risk_score >= 70 or max_overage > 15.0:
        required_tier = "CFO"
        risk_level = "High"
    elif risk_score >= 40 or max_overage > 5.0:
        required_tier = "VP of Sales"
        risk_level = "Medium"
    elif max_overage > 0.0 or risk_score >= 20:
        required_tier = "Sales Manager"
        risk_level = "Medium"
    else:
        required_tier = "Sales Rep"
        risk_level = "Low"

    # Construct EXPLAIN EVERY IMPORTANT DECISION text
    if breached_lines:
        b = breached_lines[0]
        what_str = f"Discount requested on {b['category']} ({b['discount']}%) exceeds policy limit."
        why_str = f"Deterministic policy cap for {b['category']} is {b['ceiling']}%. Overage delta is +{b['overage']}%."
        what_next_str = f"Automated routing assigned quote to {required_tier} for signoff."
        requires_approval = True
    elif blended_margin_pct < 20.0:
        what_str = f"Blended gross margin ({blended_margin_pct}%) is below minimum target (20.0%)."
        why_str = f"Total product costs exceed standard margin floor guidelines."
        what_next_str = f"Quote escalated to {required_tier} for margin exception signoff."
        requires_approval = True
    else:
        what_str = "Quote parameters fully comply with commercial policies."
        why_str = f"All line item discounts are within category ceilings and blended margin is healthy ({blended_margin_pct}%)."
        what_next_str = "Standard approval level: Sales Rep auto-authorization."
        requires_approval = False

    explanation = GovernanceExplanation(
        what=what_str,
        why=why_str,
        what_next=what_next_str,
        requires_approval=requires_approval,
        risk_level=risk_level,
        risk_score=risk_score,
        required_tier=required_tier,
    )

    return {
        "subtotal": round(subtotal, 2),
        "discount_percent": overall_disc,
        "discount_amount": discount_amount,
        "tax": tax,
        "grand_total": grand_total,
        "blended_margin_percent": blended_margin_pct,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "required_approval_tier": required_tier,
        "processed_items": processed_items,
        "explanation": explanation,
    }
