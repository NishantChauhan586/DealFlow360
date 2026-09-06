from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Header, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.quotation import QuotationStatus
from app.schemas.approval_request import (
    ApprovalActionRequest,
    ApprovalRequestResponse,
    ApprovalRoutingResultResponse,
    BRSCalculationResponse,
)
from app.schemas.quotation import (
    QuotationCreate,
    QuotationLineCreate,
    QuotationLineUpdate,
    QuotationListResponse,
    QuotationResponse,
    QuotationUpdate,
)
from app.schemas.upsell import UpsellSuggestionsResponse
from app.services.approval_engine import ApprovalEngineService
from app.services.quotation_service import QuotationService
from app.services.risk_score import RiskScoreService
from app.services.upsell_service import UpsellService

router = APIRouter(prefix="/quotations", tags=["Quotations & Approvals"])


def get_current_user_id(
    x_user_id: Optional[str] = Header(default=None, description="Authenticated User ID Header"),
) -> uuid.UUID:
    """
    Extract or synthesize current user UUID from authentication context / header.
    """
    if x_user_id:
        try:
            return uuid.UUID(x_user_id)
        except ValueError:
            pass
    return uuid.UUID("11111111-1111-1111-1111-111111111111")


def get_current_user_role(
    x_user_role: Optional[str] = Header(default="sales_rep", description="Authenticated User Role Header"),
) -> str:
    """
    Extract user role (e.g. 'sales_manager', 'finance', 'admin') from authentication header.
    """
    return x_user_role.strip().lower() if x_user_role else "sales_rep"


# ------------------------------------------------------------------------------
# Quotation Core CRUD Endpoints
# ------------------------------------------------------------------------------

@router.get(
    "",
    response_model=QuotationListResponse,
    summary="List quotations with lifecycle filters & pagination",
)
async def list_quotations(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    status: Optional[QuotationStatus] = Query(default=None, description="Filter by quotation lifecycle status"),
    sales_rep_id: Optional[uuid.UUID] = Query(default=None, description="Filter by sales representative ID"),
    customer_id: Optional[uuid.UUID] = Query(default=None, description="Filter by customer account ID"),
    session: AsyncSession = Depends(get_db),
) -> QuotationListResponse:
    """
    Retrieve paginated list of sales quotations filtered by status, sales rep, or customer.
    """
    service = QuotationService(session)
    return await service.list_quotations(
        page=page,
        page_size=page_size,
        status_filter=status,
        sales_rep_id=sales_rep_id,
        customer_id=customer_id,
    )


@router.post(
    "",
    response_model=QuotationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new draft quotation",
)
async def create_quotation(
    quotation_in: QuotationCreate,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
) -> QuotationResponse:
    """
    Create a new sales quotation in 'draft' status with optional initial line items.
    """
    service = QuotationService(session)
    quotation = await service.create_draft(
        quotation_in=quotation_in,
        current_user_id=current_user_id,
    )
    return QuotationResponse.model_validate(quotation)


@router.get(
    "/{quotation_id}",
    response_model=QuotationResponse,
    summary="Get quotation details and line items by ID",
)
async def get_quotation(
    quotation_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
) -> QuotationResponse:
    """
    Retrieve complete quotation information including all line items and current totals.
    """
    service = QuotationService(session)
    quotation = await service.get_quotation_or_404(quotation_id)
    return QuotationResponse.model_validate(quotation)


@router.put(
    "/{quotation_id}",
    response_model=QuotationResponse,
    summary="Update quotation header attributes (Draft only)",
)
async def update_quotation(
    quotation_id: uuid.UUID,
    quotation_in: QuotationUpdate,
    session: AsyncSession = Depends(get_db),
) -> QuotationResponse:
    """
    Update header fields of a quotation. Blocked if quotation is not in 'draft' status.
    """
    service = QuotationService(session)
    updated = await service.update_quotation(quotation_id, quotation_in)
    return QuotationResponse.model_validate(updated)


@router.post(
    "/{quotation_id}/lines",
    response_model=QuotationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a line item to a draft quotation",
)
async def add_quotation_line(
    quotation_id: uuid.UUID,
    line_in: QuotationLineCreate,
    session: AsyncSession = Depends(get_db),
) -> QuotationResponse:
    """
    Add a product line item, compute unit price/discount/margin, and recalculate quote totals.
    """
    service = QuotationService(session)
    quotation = await service.add_line(quotation_id, line_in)
    return QuotationResponse.model_validate(quotation)


@router.put(
    "/{quotation_id}/lines/{line_id}",
    response_model=QuotationResponse,
    summary="Update quantity or discount of a line item (Draft only)",
)
async def update_quotation_line(
    quotation_id: uuid.UUID,
    line_id: uuid.UUID,
    line_in: QuotationLineUpdate,
    session: AsyncSession = Depends(get_db),
) -> QuotationResponse:
    """
    Modify quantity or discount percentage on a quotation line item and recalculate totals.
    """
    service = QuotationService(session)
    quotation = await service.update_line(quotation_id, line_id, line_in)
    return QuotationResponse.model_validate(quotation)


@router.delete(
    "/{quotation_id}/lines/{line_id}",
    response_model=QuotationResponse,
    summary="Remove a line item from a draft quotation",
)
async def delete_quotation_line(
    quotation_id: uuid.UUID,
    line_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
) -> QuotationResponse:
    """
    Delete a line item from a draft quotation and recalculate overall totals.
    """
    service = QuotationService(session)
    quotation = await service.delete_line(quotation_id, line_id)
    return QuotationResponse.model_validate(quotation)


# ------------------------------------------------------------------------------
# BRS Risk & Approval Workflow Endpoints
# ------------------------------------------------------------------------------

@router.get(
    "/{quotation_id}/risk-score",
    response_model=BRSCalculationResponse,
    summary="Compute and inspect detailed Blended Risk Score (BRS)",
)
async def get_quotation_risk_score(
    quotation_id: uuid.UUID,
    customer_tier: Optional[str] = Query(default="gold", description="Customer tier for ceiling lookup"),
    session: AsyncSession = Depends(get_db),
) -> BRSCalculationResponse:
    """
    Calculate and breakdown the Blended Risk Score (BRS) with line-by-line overages and penalties.
    """
    service = RiskScoreService(session)
    return await service.calculate_blended_score(quotation_id, customer_tier=customer_tier)


@router.post(
    "/{quotation_id}/submit",
    response_model=ApprovalRoutingResultResponse,
    summary="Submit quotation for risk scoring and approval routing",
)
async def submit_quotation_for_approval(
    quotation_id: uuid.UUID,
    customer_tier: Optional[str] = Query(default="gold", description="Customer tier for ceiling lookup"),
    session: AsyncSession = Depends(get_db),
) -> ApprovalRoutingResultResponse:
    """
    Calculate quote BRS risk score and route through governance approval chain:
    - Low Risk (0-5): Auto-approved
    - Medium Risk (5-15): Sales Manager signoff
    - High Risk (>15): Sales Manager + Finance signoffs
    """
    service = ApprovalEngineService(session)
    return await service.route_for_approval(quotation_id, customer_tier=customer_tier)


@router.get(
    "/{quotation_id}/approvals",
    response_model=List[ApprovalRequestResponse],
    summary="List all sequential approval steps and statuses for a quotation",
)
async def get_quotation_approvals(
    quotation_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
) -> List[ApprovalRequestResponse]:
    """
    View complete audit trail of approval steps, required roles, timestamps, and decision notes.
    """
    service = ApprovalEngineService(session)
    return await service.get_approval_steps(quotation_id)


@router.post(
    "/{quotation_id}/approve",
    response_model=ApprovalRoutingResultResponse,
    summary="Approve, reject, or return a quotation approval step",
)
async def act_on_approval_step(
    quotation_id: uuid.UUID,
    action_in: ApprovalActionRequest,
    current_user_role: str = Depends(get_current_user_role),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
) -> ApprovalRoutingResultResponse:
    """
    Execute an approval decision on a specific step:
    - action 'approve': advances step. If last step, quotation -> 'approved'.
    - action 'reject' or 'return': quotation -> 'draft'.
    """
    service = ApprovalEngineService(session)
    return await service.process_approval_action(
        quotation_id=quotation_id,
        action_in=action_in,
        current_user_role=current_user_role,
        current_user_id=current_user_id,
    )


# ------------------------------------------------------------------------------
# Upsell & Cross-Sell Recommendation Endpoint
# ------------------------------------------------------------------------------

@router.get(
    "/{quotation_id}/suggestions",
    response_model=UpsellSuggestionsResponse,
    summary="Get intelligent upsell and cross-sell suggestions for a quotation",
)
async def get_upsell_suggestions(
    quotation_id: uuid.UUID,
    customer_tier: Optional[str] = Query(default=None, description="Optional customer tier for pricing lookup"),
    limit: int = Query(default=5, ge=1, le=20, description="Max number of suggestions to return"),
    cost_factor: float = Query(default=0.60, ge=0.0, le=1.0, description="Cost factor for margin computation"),
    session: AsyncSession = Depends(get_db),
) -> UpsellSuggestionsResponse:
    """
    Retrieve up to N intelligent, margin-qualified upsell & cross-sell product suggestions:
    - Analyzes existing products in the cart
    - Ranks suggestions by strategic promotion and co-purchase affinity score
    - Filters out recommendations failing the minimum margin threshold
    - Explains why each product is recommended with expected margin delta
    """
    service = UpsellService(session)
    return await service.get_suggestions(
        quotation_id=quotation_id,
        customer_tier=customer_tier,
        cost_factor=cost_factor,
        limit=limit,
    )

