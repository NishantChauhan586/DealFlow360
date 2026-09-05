from typing import Optional
import uuid
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.models.quotation import QuotationStatus
from app.schemas.order import OrderResponse
from app.schemas.portal import (
    CustomerQuotationListResponse,
    QuotationNegotiationRequest,
    QuotationNegotiationResponse,
)
from app.schemas.quotation import QuotationResponse
from app.services.customer_portal_service import CustomerPortalService

router = APIRouter(prefix="/portal", tags=["Customer Portal & Negotiation"])


def get_current_customer_id(
    authorization: Optional[str] = Header(default=None, description="Bearer JWT token"),
    x_customer_id: Optional[str] = Header(default=None, description="Direct Customer UUID header for test/dev"),
) -> uuid.UUID:
    """
    Extract and validate authenticated customer account UUID.
    Checks Authorization Bearer JWT first, falls back to X-Customer-ID header.
    """
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()
        try:
            payload = decode_token(token)
            cust_str = payload.get("customer_id")
            if cust_str:
                return uuid.UUID(cust_str)
        except (JWTError, ValueError):
            pass

    if x_customer_id:
        try:
            return uuid.UUID(x_customer_id)
        except ValueError:
            pass

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Customer authentication required. Please provide a valid customer token or X-Customer-ID header.",
        headers={"WWW-Authenticate": "Bearer"},
    )


# ------------------------------------------------------------------------------
# Customer Portal Quotation Endpoints
# ------------------------------------------------------------------------------

@router.get(
    "/quotations",
    response_model=CustomerQuotationListResponse,
    summary="List quotations belonging to current customer",
)
async def list_customer_quotations(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    status: Optional[QuotationStatus] = Query(default=None, description="Filter by quotation lifecycle status"),
    customer_id: uuid.UUID = Depends(get_current_customer_id),
    session: AsyncSession = Depends(get_db),
) -> CustomerQuotationListResponse:
    """
    Retrieve quotations strictly scoped to the authenticated customer account.
    """
    service = CustomerPortalService(session)
    return await service.list_customer_quotations(
        customer_id=customer_id,
        page=page,
        page_size=page_size,
        status_filter=status,
    )


@router.get(
    "/quotations/{quotation_id}",
    response_model=QuotationResponse,
    summary="View customer quotation detail",
)
async def get_customer_quotation(
    quotation_id: uuid.UUID,
    customer_id: uuid.UUID = Depends(get_current_customer_id),
    session: AsyncSession = Depends(get_db),
) -> QuotationResponse:
    """
    View complete quotation details including line items, discounts, and pricing breakdown.
    Enforces customer isolation (returns 404 if quotation belongs to another customer).
    """
    service = CustomerPortalService(session)
    return await service.get_customer_quotation_or_404(
        quotation_id=quotation_id,
        customer_id=customer_id,
    )


@router.post(
    "/quotations/{quotation_id}/negotiate",
    response_model=QuotationNegotiationResponse,
    summary="Submit counter-offer negotiation for a quotation",
)
async def negotiate_quotation(
    quotation_id: uuid.UUID,
    negotiation_in: QuotationNegotiationRequest,
    customer_tier: Optional[str] = Query(default="gold", description="Customer tier for discount ceiling checks"),
    customer_id: uuid.UUID = Depends(get_current_customer_id),
    session: AsyncSession = Depends(get_db),
) -> QuotationNegotiationResponse:
    """
    Submit customer counter-offer (itemized discounts, quantity changes, or uniform discount):
    1. Re-calculates quotation totals and line margins.
    2. Runs deterministic BRS Blended Discount Risk Scoring.
    3. If risk is Medium or High, changes status to 'pending_approval' and routes for manager signoff.
    4. If risk is Low, quotation is auto-approved.
    5. Dispatches real-time notification to the sales representative.
    """
    service = CustomerPortalService(session)
    return await service.negotiate_quotation(
        quotation_id=quotation_id,
        customer_id=customer_id,
        negotiation_in=negotiation_in,
        customer_tier=customer_tier,
    )


@router.post(
    "/quotations/{quotation_id}/confirm",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Confirm approved quotation and convert to Order",
)
async def confirm_quotation(
    quotation_id: uuid.UUID,
    customer_id: uuid.UUID = Depends(get_current_customer_id),
    session: AsyncSession = Depends(get_db),
) -> OrderResponse:
    """
    Confirm and convert an approved sales quotation into an official Order:
    - Validates that quotation has no pending approval blocks.
    - Creates Order and itemized OrderLines.
    - Updates quotation status to 'confirmed'.
    - Triggers hybrid billing (one-time invoice & recurring subscriptions) and warehouse fulfillment allocation.
    """
    service = CustomerPortalService(session)
    return await service.confirm_quotation(
        quotation_id=quotation_id,
        customer_id=customer_id,
    )
