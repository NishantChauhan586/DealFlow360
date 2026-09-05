from datetime import datetime, timezone
import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from app.models.quote import Quote, QuoteItem, ApprovalAudit
from app.schemas.quote import QuoteCreate, QuoteUpdate, ApprovalDecisionRequest
from app.services.governance_service import evaluate_quote_governance


async def get_all_quotes(db: AsyncSession, status: Optional[str] = None) -> List[Quote]:
    """
    Fetch all quotations from database with optional stage filter.
    """
    query = select(Quote).options(selectinload(Quote.items), selectinload(Quote.approval_audits)).order_by(Quote.created_at.desc())
    if status:
        query = query.where(Quote.status == status)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_quote_by_id(db: AsyncSession, quote_id: str) -> Optional[Quote]:
    """
    Fetch single quotation by unique ID.
    """
    query = select(Quote).options(selectinload(Quote.items), selectinload(Quote.approval_audits)).where(Quote.id == quote_id)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def create_quote(db: AsyncSession, quote_in: QuoteCreate, sales_rep: str = "S. Adeyemi") -> Quote:
    """
    Create a new quote, evaluate deterministic governance, and persist to local DB.
    """
    # Generate unique quote ID e.g. Q-1001 or custom
    query_count = select(Quote)
    res = await db.execute(query_count)
    existing_count = len(list(res.scalars().all()))
    quote_id = f"Q-{1001 + existing_count}"

    items_payload = [item.model_dump() for item in quote_in.line_items]
    eval_res = evaluate_quote_governance(items_payload, quote_in.discount_percent)

    db_quote = Quote(
        id=quote_id,
        customer_name=quote_in.customer_name,
        customer_email=quote_in.customer_email.lower(),
        company_name=quote_in.company_name,
        title=quote_in.title,
        description=quote_in.description,
        currency=quote_in.currency,
        valid_until=quote_in.valid_until,
        status="Draft",
        sales_rep=sales_rep,
        subtotal=eval_res["subtotal"],
        discount_percent=eval_res["discount_percent"],
        discount_amount=eval_res["discount_amount"],
        tax=eval_res["tax"],
        grand_total=eval_res["grand_total"],
        blended_margin_percent=eval_res["blended_margin_percent"],
        risk_score=eval_res["risk_score"],
        risk_level=eval_res["risk_level"],
        required_approval_tier=eval_res["required_approval_tier"],
    )

    db.add(db_quote)
    await db.flush()

    for item_data in eval_res["processed_items"]:
        item_id = f"item_{uuid.uuid4().hex[:8]}"
        db_item = QuoteItem(
            id=item_id,
            quote_id=quote_id,
            product_id=item_data.get("product_id"),
            name=item_data["name"],
            category=item_data["category"],
            quantity=item_data["quantity"],
            unit_price=item_data["unit_price"],
            unit_cost=item_data["unit_cost"],
            discount_percent=item_data["discount_percent"],
            line_total=item_data["line_total"],
            ceiling_percent=item_data["ceiling_percent"],
            ceiling_breached=item_data["ceiling_breached"],
            overage_percent=item_data["overage_percent"],
        )
        db.add(db_item)

    await db.commit()
    await db.refresh(db_quote)
    return db_quote


async def submit_quote_for_approval(db: AsyncSession, quote_id: str) -> Quote:
    """
    Submits draft quotation for approval routing.
    If required_approval_tier is 'Sales Rep', auto-approves to 'Approved', otherwise moves to 'Pending Approval'.
    """
    quote = await get_quote_by_id(db, quote_id)
    if not quote:
        raise ValueError(f"Quotation {quote_id} not found.")

    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    quote.submitted_at = now_str

    if quote.required_approval_tier == "Sales Rep" and quote.risk_level == "Low":
        quote.status = "Approved"
        audit = ApprovalAudit(
            quote_id=quote_id,
            approver_name="Auto Governance System",
            approver_role="System",
            action="approved",
            rationale="Quote complies with all ceiling policies and margin floors. Auto-approved.",
        )
        db.add(audit)
    else:
        quote.status = "Pending Approval"

    await db.commit()
    await db.refresh(quote)
    return quote


async def process_approval_decision(
    db: AsyncSession, quote_id: str, decision: ApprovalDecisionRequest
) -> Quote:
    """
    Processes approval signoff or rejection with audit logging.
    """
    quote = await get_quote_by_id(db, quote_id)
    if not quote:
        raise ValueError(f"Quotation {quote_id} not found.")

    if decision.action.lower() == "approved":
        quote.status = "Approved"
    elif decision.action.lower() == "rejected":
        quote.status = "Rejected"

    audit = ApprovalAudit(
        quote_id=quote_id,
        approver_name=decision.approver_name,
        approver_role=decision.approver_role,
        action=decision.action.lower(),
        rationale=decision.rationale or "Reviewed against commercial governance policy.",
    )
    db.add(audit)

    await db.commit()
    await db.refresh(quote)
    return quote


async def update_quote(db: AsyncSession, quote_id: str, quote_in: QuoteUpdate) -> Quote:
    """
    Updates quotation metadata, line items, status, and re-evaluates governance.
    """
    quote = await get_quote_by_id(db, quote_id)
    if not quote:
        raise ValueError(f"Quotation {quote_id} not found.")

    if quote_in.title is not None:
        quote.title = quote_in.title
    if quote_in.customer_name is not None:
        quote.customer_name = quote_in.customer_name
    if quote_in.customer_email is not None:
        quote.customer_email = quote_in.customer_email.lower()
    if quote_in.company_name is not None:
        quote.company_name = quote_in.company_name
    if quote_in.description is not None:
        quote.description = quote_in.description
    if quote_in.currency is not None:
        quote.currency = quote_in.currency
    if quote_in.valid_until is not None:
        quote.valid_until = quote_in.valid_until
    if quote_in.status is not None:
        quote.status = quote_in.status

    if quote_in.line_items is not None or quote_in.discount_percent is not None:
        disc = quote_in.discount_percent if quote_in.discount_percent is not None else quote.discount_percent
        items = quote_in.line_items if quote_in.line_items is not None else quote.items

        items_payload = [item.model_dump() if hasattr(item, "model_dump") else item for item in items]
        eval_res = evaluate_quote_governance(items_payload, disc)

        quote.subtotal = eval_res["subtotal"]
        quote.discount_percent = eval_res["discount_percent"]
        quote.discount_amount = eval_res["discount_amount"]
        quote.tax = eval_res["tax"]
        quote.grand_total = eval_res["grand_total"]
        quote.blended_margin_percent = eval_res["blended_margin_percent"]
        quote.risk_score = eval_res["risk_score"]
        quote.risk_level = eval_res["risk_level"]
        quote.required_approval_tier = eval_res["required_approval_tier"]

        if quote_in.line_items is not None:
            await db.execute(delete(QuoteItem).where(QuoteItem.quote_id == quote_id))
            for item_data in eval_res["processed_items"]:
                item_id = f"item_{uuid.uuid4().hex[:8]}"
                db_item = QuoteItem(
                    id=item_id,
                    quote_id=quote_id,
                    product_id=item_data.get("product_id"),
                    name=item_data["name"],
                    category=item_data["category"],
                    quantity=item_data["quantity"],
                    unit_price=item_data["unit_price"],
                    unit_cost=item_data["unit_cost"],
                    discount_percent=item_data["discount_percent"],
                    line_total=item_data["line_total"],
                    ceiling_percent=item_data["ceiling_percent"],
                    ceiling_breached=item_data["ceiling_breached"],
                    overage_percent=item_data["overage_percent"],
                )
                db.add(db_item)

    await db.commit()
    await db.refresh(quote)
    return quote


async def delete_quote(db: AsyncSession, quote_id: str) -> bool:
    """
    Deletes quote from database.
    """
    quote = await get_quote_by_id(db, quote_id)
    if not quote:
        return False

    await db.delete(quote)
    await db.commit()
    return True

