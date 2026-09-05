from typing import Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.approval_chain import (
    ApprovalChainCreate,
    ApprovalChainListResponse,
    ApprovalChainResolveRequest,
    ApprovalChainResolveResponse,
    ApprovalChainResponse,
    ApprovalChainUpdate,
)
from app.services.approval_config_service import ApprovalConfigService

router = APIRouter(prefix="/approval-chains", tags=["Approval Governance"])


@router.get(
    "",
    response_model=ApprovalChainListResponse,
    summary="List approval chains with pagination & status filters (Admin)",
)
async def list_approval_chains(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    is_active: Optional[bool] = Query(default=None, description="Filter active/inactive chains"),
    session: AsyncSession = Depends(get_db),
) -> ApprovalChainListResponse:
    """
    Retrieve configured risk-triggered approval hierarchies.
    """
    service = ApprovalConfigService(session)
    return await service.list_chains(
        page=page,
        page_size=page_size,
        is_active=is_active,
    )


@router.post(
    "/resolve",
    response_model=ApprovalChainResolveResponse,
    summary="Resolve required approval chain for a given BRS risk score",
)
async def resolve_approval_chain_post(
    request: ApprovalChainResolveRequest,
    session: AsyncSession = Depends(get_db),
) -> ApprovalChainResolveResponse:
    """
    Evaluate quote BRS risk score against active approval triggers and return required hierarchy with explanation.
    """
    service = ApprovalConfigService(session)
    return await service.resolve_chain_for_risk(request.brs_score)


@router.get(
    "/resolve-by-risk",
    response_model=ApprovalChainResolveResponse,
    summary="Quick resolve required approval chain by risk score query",
)
async def resolve_approval_chain_get(
    brs_score: float = Query(..., ge=0.0, le=100.0, description="Quote Business Risk Score (BRS)"),
    session: AsyncSession = Depends(get_db),
) -> ApprovalChainResolveResponse:
    """
    Convenience GET endpoint for evaluating required signoff chain given a risk score.
    """
    service = ApprovalConfigService(session)
    return await service.resolve_chain_for_risk(brs_score)


@router.post(
    "",
    response_model=ApprovalChainResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new approval chain policy (Admin)",
)
async def create_approval_chain(
    chain_in: ApprovalChainCreate,
    session: AsyncSession = Depends(get_db),
) -> ApprovalChainResponse:
    """
    Create a new approval policy specifying trigger condition and sequential approver roles.
    """
    service = ApprovalConfigService(session)
    chain = await service.create_chain(chain_in)
    return ApprovalChainResponse.model_validate(chain)


@router.get(
    "/{chain_id}",
    response_model=ApprovalChainResponse,
    summary="Get approval chain by ID (Admin)",
)
async def get_approval_chain(
    chain_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
) -> ApprovalChainResponse:
    """
    Fetch single approval chain configuration details.
    """
    service = ApprovalConfigService(session)
    chain = await service.get_chain_or_404(chain_id)
    return ApprovalChainResponse.model_validate(chain)


@router.put(
    "/{chain_id}",
    response_model=ApprovalChainResponse,
    summary="Update approval chain policy (Admin)",
)
async def update_approval_chain(
    chain_id: uuid.UUID,
    chain_in: ApprovalChainUpdate,
    session: AsyncSession = Depends(get_db),
) -> ApprovalChainResponse:
    """
    Update trigger thresholds, approver sequence, or active state.
    """
    service = ApprovalConfigService(session)
    updated = await service.update_chain(chain_id, chain_in)
    return ApprovalChainResponse.model_validate(updated)


@router.delete(
    "/{chain_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete approval chain policy (Admin)",
)
async def delete_approval_chain(
    chain_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
) -> None:
    """
    Remove an obsolete approval chain policy.
    """
    service = ApprovalConfigService(session)
    await service.delete_chain(chain_id)
