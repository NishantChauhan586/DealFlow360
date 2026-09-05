from datetime import datetime, timezone
from typing import List, Optional
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.models.approval_chain import ApprovalChain
from app.models.approval_request import ApprovalRequest, ApprovalStepStatus
from app.models.quotation import Quotation, QuotationStatus
from app.repositories.approval_chain_repository import ApprovalChainRepository
from app.repositories.approval_request_repository import ApprovalRequestRepository
from app.repositories.quotation_repository import QuotationRepository
from app.schemas.approval_request import (
    ApprovalActionRequest,
    ApprovalRequestResponse,
    ApprovalRoutingResultResponse,
)
from app.services.quotation_service import log_audit_event
from app.services.risk_score import RiskScoreService

logger = structlog.get_logger(__name__)


class ApprovalEngineService:
    """
    Core Approval Engine managing multi-role signoff workflows, sequential approvals, and risk-triggered policy routing.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.quote_repo = QuotationRepository(session)
        self.step_repo = ApprovalRequestRepository(session)
        self.chain_repo = ApprovalChainRepository(session)
        self.risk_service = RiskScoreService(session)

    async def route_for_approval(
        self,
        quotation_id: uuid.UUID,
        customer_tier: Optional[str] = None,
    ) -> ApprovalRoutingResultResponse:
        """
        Evaluate quote BRS risk score and route to the appropriate approval hierarchy:
        - Low Risk (0-5) -> Auto-approved immediately
        - Medium Risk (5-15) -> Requires Sales Manager signoff
        - High Risk (>15) -> Requires Sales Manager + Finance signoffs
        """
        quote = await self.quote_repo.get_by_id(quotation_id)
        if not quote:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quotation with ID '{quotation_id}' was not found.",
            )

        if quote.status not in (QuotationStatus.DRAFT, QuotationStatus.REJECTED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Quotation '{quotation_id}' cannot be submitted because its status is "
                    f"'{quote.status.value}'. Only draft quotes can be submitted for approval."
                ),
            )

        if not quote.lines:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot submit an empty quotation. Please add at least one line item.",
            )

        # 1. Compute Blended Risk Score (BRS)
        brs_result = await self.risk_service.calculate_blended_score(
            quotation_id=quote.id,
            customer_tier=customer_tier,
        )
        blended_score = brs_result.blended_risk_score

        # 2. Find matching ApprovalChain for the risk score
        active_chains = await self.chain_repo.get_active_chains()
        matched_chain: Optional[ApprovalChain] = None

        for chain in active_chains:
            cond = chain.trigger_condition or {}
            min_r = float(cond.get("min_risk", 0.0))
            max_r = float(cond.get("max_risk", 1000.0))
            if min_r <= blended_score <= max_r:
                matched_chain = chain
                break

        # Fallback heuristic if explicit chain not matched
        required_roles: List[str] = []
        if matched_chain and matched_chain.sequence:
            required_roles = matched_chain.sequence
        elif blended_score > 15.0:
            required_roles = ["sales_manager", "finance"]
        elif blended_score > 5.0:
            required_roles = ["sales_manager"]
        else:
            required_roles = []

        # 3. Clean up prior approval requests
        await self.step_repo.delete_by_quotation(quote.id)

        # 4. Handle routing outcome
        now = datetime.now(timezone.utc)
        step_responses = []

        if not required_roles or blended_score <= 5.0:
            # Auto-approve
            quote.status = QuotationStatus.APPROVED
            await self.quote_repo.save(quote)
            await self.session.commit()

            explanation = (
                f"Quotation auto-approved. BRS score {blended_score:.2f} (Low Risk) is within "
                f"authorized operating threshold. No signoff required."
            )
            await log_audit_event(
                action="QUOTATION_AUTO_APPROVED",
                entity_type="Quotation",
                entity_id=quote.id,
                user_id=quote.sales_rep_id,
                payload={"brs_score": blended_score, "status": "approved"},
            )

            return ApprovalRoutingResultResponse(
                quotation_id=quote.id,
                status=quote.status,
                blended_risk_score=blended_score,
                risk_level=brs_result.risk_level,
                approval_required=False,
                steps=[],
                explanation=explanation,
            )

        # Multi-role approval required
        steps_to_create = []
        for idx, role in enumerate(required_roles):
            step = ApprovalRequest(
                quotation_id=quote.id,
                step_order=idx + 1,
                role_required=role,
                status=ApprovalStepStatus.PENDING,
                requested_at=now,
            )
            steps_to_create.append(step)

        created_steps = await self.step_repo.create_many(steps_to_create)
        quote.status = QuotationStatus.PENDING_APPROVAL
        await self.quote_repo.save(quote)
        await self.session.commit()

        roles_display = " -> ".join([r.replace("_", " ").title() for r in required_roles])
        explanation = (
            f"Quotation submitted for approval. BRS score {blended_score:.2f} ({brs_result.risk_level} Risk). "
            f"Requires sequential signoff: {roles_display}."
        )

        await log_audit_event(
            action="QUOTATION_SUBMITTED_FOR_APPROVAL",
            entity_type="Quotation",
            entity_id=quote.id,
            user_id=quote.sales_rep_id,
            payload={
                "brs_score": blended_score,
                "risk_level": brs_result.risk_level,
                "required_roles": required_roles,
            },
        )

        return ApprovalRoutingResultResponse(
            quotation_id=quote.id,
            status=quote.status,
            blended_risk_score=blended_score,
            risk_level=brs_result.risk_level,
            approval_required=True,
            steps=[ApprovalRequestResponse.model_validate(s) for s in created_steps],
            explanation=explanation,
        )

    async def get_approval_steps(
        self, quotation_id: uuid.UUID
    ) -> List[ApprovalRequestResponse]:
        """
        Fetch all approval steps associated with a quotation.
        """
        steps = await self.step_repo.list_by_quotation(quotation_id)
        return [ApprovalRequestResponse.model_validate(s) for s in steps]

    async def process_approval_action(
        self,
        quotation_id: uuid.UUID,
        action_in: ApprovalActionRequest,
        current_user_role: str,
        current_user_id: uuid.UUID,
    ) -> ApprovalRoutingResultResponse:
        """
        Process an approval signoff, rejection, or return action by an authorized approver.
        - On Approve: advances to next step. If all steps approved, status -> 'approved'.
        - On Reject or Return: status -> 'draft'.
        """
        quote = await self.quote_repo.get_by_id(quotation_id)
        if not quote:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quotation with ID '{quotation_id}' was not found.",
            )

        if quote.status != QuotationStatus.PENDING_APPROVAL:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Quotation '{quotation_id}' is in status '{quote.status.value}'. "
                    f"Only quotations in 'pending_approval' can be acted upon."
                ),
            )

        steps = await self.step_repo.list_by_quotation(quotation_id)
        if not steps:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No approval steps found for this quotation.",
            )

        target_step: Optional[ApprovalRequest] = None
        for step in steps:
            if step.id == action_in.step_id:
                target_step = step
                break

        if not target_step:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Approval step '{action_in.step_id}' does not belong to quotation '{quotation_id}'.",
            )

        if target_step.status != ApprovalStepStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Step {target_step.step_order} has already been resolved with status '{target_step.status.value}'.",
            )

        # Enforce sequential order: all preceding steps must be approved
        for prior_step in steps:
            if prior_step.step_order < target_step.step_order:
                if prior_step.status != ApprovalStepStatus.APPROVED:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Step {target_step.step_order} cannot be acted upon because "
                            f"preceding step {prior_step.step_order} ({prior_step.role_required}) is not yet approved."
                        ),
                    )

        # Role authorization check: user must possess the required role (or admin)
        clean_user_role = current_user_role.strip().lower()
        if (
            clean_user_role != target_step.role_required.lower()
            and clean_user_role != "admin"
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Action forbidden: step requires role '{target_step.role_required}', "
                    f"but user has role '{current_user_role}'."
                ),
            )

        now = datetime.now(timezone.utc)
        action_verb = action_in.action.lower()

        if action_verb == "approve":
            target_step.status = ApprovalStepStatus.APPROVED
            target_step.completed_at = now
            target_step.reason = action_in.reason
            target_step.decision_by = current_user_id
            await self.step_repo.update(
                target_step,
                {
                    "status": ApprovalStepStatus.APPROVED,
                    "completed_at": now,
                    "reason": action_in.reason,
                    "decision_by": current_user_id,
                },
            )

            # Check if all steps in sequence are now approved
            all_approved = all(
                s.status == ApprovalStepStatus.APPROVED
                for s in steps
                if s.id != target_step.id
            )
            if all_approved:
                quote.status = QuotationStatus.APPROVED
                await self.quote_repo.save(quote)
                explanation = f"Step {target_step.step_order} approved by {target_step.role_required}. All approvals complete: Quotation is now APPROVED."
            else:
                next_step = next(s for s in steps if s.step_order == target_step.step_order + 1)
                explanation = f"Step {target_step.step_order} approved. Pending signoff from Step {next_step.step_order} ({next_step.role_required})."

        elif action_verb in ("reject", "return"):
            new_status = (
                ApprovalStepStatus.REJECTED
                if action_verb == "reject"
                else ApprovalStepStatus.RETURNED
            )
            target_step.status = new_status
            target_step.completed_at = now
            target_step.reason = action_in.reason
            target_step.decision_by = current_user_id
            await self.step_repo.update(
                target_step,
                {
                    "status": new_status,
                    "completed_at": now,
                    "reason": action_in.reason,
                    "decision_by": current_user_id,
                },
            )

            # On reject or return, quotation transitions back to draft
            quote.status = QuotationStatus.DRAFT
            await self.quote_repo.save(quote)

            explanation = (
                f"Quotation {action_verb}ed at Step {target_step.step_order} by {target_step.role_required} "
                f"with reason: '{action_in.reason or 'No reason provided'}'. Status reverted to DRAFT."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported approval action '{action_verb}'.",
            )

        await self.session.commit()

        await log_audit_event(
            action=f"APPROVAL_STEP_{action_verb.upper()}",
            entity_type="Quotation",
            entity_id=quote.id,
            user_id=current_user_id,
            payload={
                "step_id": str(target_step.id),
                "step_order": target_step.step_order,
                "role_required": target_step.role_required,
                "action": action_verb,
                "reason": action_in.reason,
                "quote_status": quote.status.value,
            },
        )

        updated_steps = await self.step_repo.list_by_quotation(quotation_id)
        return ApprovalRoutingResultResponse(
            quotation_id=quote.id,
            status=quote.status,
            blended_risk_score=quote.blended_risk_score or 0.0,
            risk_level="Evaluated",
            approval_required=quote.status == QuotationStatus.PENDING_APPROVAL,
            steps=[ApprovalRequestResponse.model_validate(s) for s in updated_steps],
            explanation=explanation,
        )


async def route_for_approval(
    quotation_id: uuid.UUID,
    session: AsyncSession,
    customer_tier: Optional[str] = None,
) -> ApprovalRoutingResultResponse:
    """Helper functional interface for routing quotation for approval."""
    service = ApprovalEngineService(session)
    return await service.route_for_approval(quotation_id, customer_tier=customer_tier)
