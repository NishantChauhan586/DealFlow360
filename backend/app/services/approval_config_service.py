import math
from typing import Optional
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.models.approval_chain import ApprovalChain
from app.repositories.approval_chain_repository import ApprovalChainRepository
from app.schemas.approval_chain import (
    ApprovalChainCreate,
    ApprovalChainListResponse,
    ApprovalChainResolveResponse,
    ApprovalChainResponse,
    ApprovalChainUpdate,
)

logger = structlog.get_logger(__name__)


class ApprovalConfigService:
    """
    Business service layer managing approval chain definitions and deterministic risk-triggered routing.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.chain_repo = ApprovalChainRepository(session)

    async def get_chain_or_404(self, chain_id: uuid.UUID) -> ApprovalChain:
        """
        Fetch an approval chain by ID or raise 404 HTTPException.
        """
        chain = await self.chain_repo.get_by_id(chain_id)
        if not chain:
            logger.warning("approval_chain_not_found", chain_id=str(chain_id))
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"ApprovalChain with ID '{chain_id}' was not found.",
            )
        return chain

    async def list_chains(
        self,
        page: int = 1,
        page_size: int = 20,
        is_active: Optional[bool] = None,
    ) -> ApprovalChainListResponse:
        """
        List paginated approval chains with optional active status filter.
        """
        if page < 1:
            page = 1
        if page_size < 1 or page_size > 100:
            page_size = 20

        skip = (page - 1) * page_size
        items, total = await self.chain_repo.list_chains(
            skip=skip,
            limit=page_size,
            is_active=is_active,
        )

        total_pages = math.ceil(total / page_size) if total > 0 else 1

        return ApprovalChainListResponse(
            items=[ApprovalChainResponse.model_validate(c) for c in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    async def create_chain(
        self, chain_in: ApprovalChainCreate
    ) -> ApprovalChain:
        """
        Persist a new approval chain governance policy.
        """
        chain = await self.chain_repo.create(chain_in)
        await self.session.commit()
        logger.info(
            "approval_chain_created",
            chain_id=str(chain.id),
            name=chain.name,
            sequence=chain.sequence,
        )
        return chain

    async def update_chain(
        self, chain_id: uuid.UUID, chain_in: ApprovalChainUpdate
    ) -> ApprovalChain:
        """
        Update an existing approval chain policy.
        """
        chain = await self.get_chain_or_404(chain_id)
        updated = await self.chain_repo.update(chain, chain_in)
        await self.session.commit()
        logger.info("approval_chain_updated", chain_id=str(chain_id))
        return updated

    async def delete_chain(self, chain_id: uuid.UUID) -> None:
        """
        Delete an approval chain policy.
        """
        chain = await self.get_chain_or_404(chain_id)
        await self.chain_repo.delete(chain)
        await self.session.commit()
        logger.info("approval_chain_deleted", chain_id=str(chain_id))

    async def resolve_chain_for_risk(
        self, brs_score: float
    ) -> ApprovalChainResolveResponse:
        """
        Deterministic Rule: Evaluate active approval chains against quote BRS risk score.
        Matches trigger condition: min_risk <= brs_score <= max_risk.
        Explains WHY approval is or isn't required according to DealFlow360 governance rules.
        """
        active_chains = await self.chain_repo.get_active_chains()

        matched_chain: Optional[ApprovalChain] = None

        for chain in active_chains:
            cond = chain.trigger_condition or {}
            min_risk = float(cond.get("min_risk", 0.0))
            max_risk = float(cond.get("max_risk", 100.0)) if "max_risk" in cond else None

            if max_risk is not None:
                if min_risk <= brs_score <= max_risk:
                    matched_chain = chain
                    break
            else:
                if brs_score >= min_risk:
                    matched_chain = chain
                    break

        if matched_chain and matched_chain.sequence:
            roles_formatted = " -> ".join([r.replace("_", " ").title() for r in matched_chain.sequence])
            explanation = (
                f"Quote BRS risk score ({brs_score:.1f}) triggered approval policy '{matched_chain.name}'. "
                f"Requires sequential signoff: {roles_formatted}."
            )
            logger.info(
                "approval_chain_resolved",
                brs_score=brs_score,
                chain_id=str(matched_chain.id),
                chain_name=matched_chain.name,
                sequence=matched_chain.sequence,
            )
            return ApprovalChainResolveResponse(
                brs_score=brs_score,
                approval_required=True,
                chain_id=matched_chain.id,
                chain_name=matched_chain.name,
                sequence=matched_chain.sequence,
                trigger_condition=matched_chain.trigger_condition,
                explanation=explanation,
            )

        # No chain triggered / Low risk auto-approved
        explanation = (
            f"Quote BRS risk score ({brs_score:.1f}) is within standard operating parameters. "
            f"No executive or multi-tier approval required."
        )
        logger.info("approval_not_required", brs_score=brs_score)
        return ApprovalChainResolveResponse(
            brs_score=brs_score,
            approval_required=False,
            chain_id=None,
            chain_name=None,
            sequence=[],
            trigger_condition=None,
            explanation=explanation,
        )
