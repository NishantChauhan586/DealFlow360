from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.approval_request import ApprovalRequest


class ApprovalRequestRepository:
    """
    Data access repository for ApprovalRequest signoff steps.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, step_id: uuid.UUID) -> Optional[ApprovalRequest]:
        """
        Fetch a single approval step by primary key.
        """
        stmt = select(ApprovalRequest).where(ApprovalRequest.id == step_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_quotation(
        self, quotation_id: uuid.UUID
    ) -> List[ApprovalRequest]:
        """
        List all sequential approval steps for a quotation.
        """
        stmt = (
            select(ApprovalRequest)
            .where(ApprovalRequest.quotation_id == quotation_id)
            .order_by(ApprovalRequest.step_order.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, step: ApprovalRequest) -> ApprovalRequest:
        """
        Persist a single approval step.
        """
        self.session.add(step)
        await self.session.flush()
        await self.session.refresh(step)
        return step

    async def create_many(
        self, steps: List[ApprovalRequest]
    ) -> List[ApprovalRequest]:
        """
        Bulk persist sequential approval steps.
        """
        for s in steps:
            self.session.add(s)
        await self.session.flush()
        for s in steps:
            await self.session.refresh(s)
        return steps

    async def update(
        self, step: ApprovalRequest, updates: Dict[str, Any]
    ) -> ApprovalRequest:
        """
        Update attributes of an approval step.
        """
        for field, val in updates.items():
            setattr(step, field, val)

        self.session.add(step)
        await self.session.flush()
        await self.session.refresh(step)
        return step

    async def delete_by_quotation(self, quotation_id: uuid.UUID) -> None:
        """
        Remove existing approval steps for a quotation (e.g. when resubmitting a draft).
        """
        stmt = delete(ApprovalRequest).where(
            ApprovalRequest.quotation_id == quotation_id
        )
        await self.session.execute(stmt)
        await self.session.flush()
