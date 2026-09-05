from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.quote import (
    QuoteCreate,
    QuoteUpdate,
    QuoteResponse,
    ApprovalDecisionRequest,
    GovernanceExplanation,
)
from app.services.quote_service import (
    get_all_quotes,
    get_quote_by_id,
    create_quote,
    update_quote,
    submit_quote_for_approval,
    process_approval_decision,
    delete_quote,
)
from app.services.governance_service import evaluate_quote_governance

router = APIRouter(prefix="/quotes", tags=["Quotations & Lifecycle"])


def _attach_explanation(quote_dict: dict) -> dict:
    """Helper to attach governance explanation object to quote dict."""
    items = quote_dict.get("items", []) or quote_dict.get("line_items", [])
    raw_items = []
    for it in items:
        if isinstance(it, dict):
            raw_items.append(it)
        else:
            raw_items.append({
                "name": it.name,
                "category": it.category,
                "quantity": it.quantity,
                "unit_price": it.unit_price,
                "unit_cost": it.unit_cost,
                "discount_percent": it.discount_percent,
                "product_id": it.product_id,
            })

    eval_res = evaluate_quote_governance(raw_items, quote_dict.get("discount_percent", 0.0))
    quote_dict["explanation"] = eval_res["explanation"]
    quote_dict["line_items"] = items
    return quote_dict


@router.get("", response_model=List[QuoteResponse], summary="List All Quotations")
async def list_quotes(status_filter: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    """
    Retrieves all stored quotations from the local database.
    """
    quotes = await get_all_quotes(db, status=status_filter)
    result = []
    for q in quotes:
        q_dict = {
            "id": q.id,
            "customer_name": q.customer_name,
            "customer_email": q.customer_email,
            "company_name": q.company_name,
            "title": q.title,
            "description": q.description,
            "currency": q.currency,
            "valid_until": q.valid_until,
            "status": q.status,
            "sales_rep": q.sales_rep,
            "subtotal": q.subtotal,
            "discount_percent": q.discount_percent,
            "discount_amount": q.discount_amount,
            "tax": q.tax,
            "grand_total": q.grand_total,
            "blended_margin_percent": q.blended_margin_percent,
            "risk_score": q.risk_score,
            "risk_level": q.risk_level,
            "required_approval_tier": q.required_approval_tier,
            "submitted_at": q.submitted_at,
            "line_items": [
                {
                    "id": item.id,
                    "quote_id": item.quote_id,
                    "name": item.name,
                    "category": item.category,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "unit_cost": item.unit_cost,
                    "discount_percent": item.discount_percent,
                    "line_total": item.line_total,
                    "ceiling_percent": item.ceiling_percent,
                    "ceiling_breached": item.ceiling_breached,
                    "overage_percent": item.overage_percent,
                    "product_id": item.product_id,
                }
                for item in q.items
            ],
            "approval_audits": [
                {
                    "id": audit.id,
                    "quote_id": audit.quote_id,
                    "approver_name": audit.approver_name,
                    "approver_role": audit.approver_role,
                    "action": audit.action,
                    "breached_rule": audit.breached_rule,
                    "overage_percent": audit.overage_percent,
                    "rationale": audit.rationale,
                    "created_at": audit.created_at.isoformat(),
                }
                for audit in q.approval_audits
            ],
        }
        result.append(_attach_explanation(q_dict))
    return result


@router.get("/{quote_id}", response_model=QuoteResponse, summary="Get Quotation Details")
async def get_quote(quote_id: str, db: AsyncSession = Depends(get_db)):
    """
    Get detailed quotation by ID with governance risk breakdown.
    """
    q = await get_quote_by_id(db, quote_id)
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found.")

    q_dict = {
        "id": q.id,
        "customer_name": q.customer_name,
        "customer_email": q.customer_email,
        "company_name": q.company_name,
        "title": q.title,
        "description": q.description,
        "currency": q.currency,
        "valid_until": q.valid_until,
        "status": q.status,
        "sales_rep": q.sales_rep,
        "subtotal": q.subtotal,
        "discount_percent": q.discount_percent,
        "discount_amount": q.discount_amount,
        "tax": q.tax,
        "grand_total": q.grand_total,
        "blended_margin_percent": q.blended_margin_percent,
        "risk_score": q.risk_score,
        "risk_level": q.risk_level,
        "required_approval_tier": q.required_approval_tier,
        "submitted_at": q.submitted_at,
        "line_items": [
            {
                "id": item.id,
                "quote_id": item.quote_id,
                "name": item.name,
                "category": item.category,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "unit_cost": item.unit_cost,
                "discount_percent": item.discount_percent,
                "line_total": item.line_total,
                "ceiling_percent": item.ceiling_percent,
                "ceiling_breached": item.ceiling_breached,
                "overage_percent": item.overage_percent,
                "product_id": item.product_id,
            }
            for item in q.items
        ],
        "approval_audits": [
            {
                "id": audit.id,
                "quote_id": audit.quote_id,
                "approver_name": audit.approver_name,
                "approver_role": audit.approver_role,
                "action": audit.action,
                "breached_rule": audit.breached_rule,
                "overage_percent": audit.overage_percent,
                "rationale": audit.rationale,
                "created_at": audit.created_at.isoformat(),
            }
            for audit in q.approval_audits
        ],
    }
    return _attach_explanation(q_dict)


@router.post("", response_model=QuoteResponse, summary="Create New Quotation")
async def create_new_quote(payload: QuoteCreate, db: AsyncSession = Depends(get_db)):
    """
    Creates a new quotation, calculates margin floors & discount ceilings, and stores in DB.
    """
    q = await create_quote(db, payload)
    return await get_quote(q.id, db)


@router.put("/{quote_id}", response_model=QuoteResponse, summary="Update Existing Quotation")
async def update_quote_details(quote_id: str, payload: QuoteUpdate, db: AsyncSession = Depends(get_db)):
    """
    Updates quotation metadata, discounts, line items, status, and recalculates commercial governance.
    """
    try:
        await update_quote(db, quote_id, payload)
        return await get_quote(quote_id, db)
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err))


@router.post("/{quote_id}/submit", response_model=QuoteResponse, summary="Submit Quotation for Approval")
async def submit_quote(quote_id: str, db: AsyncSession = Depends(get_db)):
    """
    Submits draft quotation for approval routing.
    """
    try:
        await submit_quote_for_approval(db, quote_id)
        return await get_quote(quote_id, db)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@router.post("/{quote_id}/approve", response_model=QuoteResponse, summary="Approve or Reject Quotation")
async def approve_quote(quote_id: str, decision: ApprovalDecisionRequest, db: AsyncSession = Depends(get_db)):
    """
    Approves or rejects a quotation with explanation logging.
    """
    try:
        await process_approval_decision(db, quote_id, decision)
        return await get_quote(quote_id, db)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@router.delete("/{quote_id}", summary="Delete Quotation")
async def remove_quote(quote_id: str, db: AsyncSession = Depends(get_db)):
    """
    Deletes a quotation.
    """
    success = await delete_quote(db, quote_id)
    if not success:
        raise HTTPException(status_code=404, detail="Quotation not found.")
    return {"message": f"Quotation {quote_id} deleted successfully."}
