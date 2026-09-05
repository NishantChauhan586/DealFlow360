from typing import List, Optional, Tuple
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.approval_chain import ApprovalChain
from app.schemas.approval_chain import ApprovalChainCreate, ApprovalChainUpdate


class ApprovalChainRepository:
    """
    Data access repository for ApprovalChain governance policies.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, chain_id: uuid.UUID) -> Optional[ApprovalChain]:
        """
        Fetch a single approval chain policy by primary key.
        """
        stmt = select(ApprovalChain).where(ApprovalChain.id == chain_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_chains(
        self,
        skip: int = 0,
        limit: int = 50,
        is_active: Optional[bool] = None,
    ) -> Tuple[List[ApprovalChain], int]:
        """
        List paginated approval chains with optional active status filter.
        """
        base_query = select(ApprovalChain)
        count_query = select(func.count()).select_from(ApprovalChain)

        if is_active is not None:
            base_query = base_query.where(ApprovalChain.is_active == is_active)
            count_query = count_query.where(ApprovalChain.is_active == is_active)

        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        stmt = (
            base_query.order_by(ApprovalChain.created_at.asc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        items = list(result.scalars().all())

        return items, total

    async def get_active_chains(self) -> List[ApprovalChain]:
        """
        Fetch all active approval chains for governance evaluation.
        """
        stmt = (
            select(ApprovalChain)
            .where(ApprovalChain.is_active.is_(True))
            .order_by(ApprovalChain.created_at.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, chain_in: ApprovalChainCreate) -> ApprovalChain:
        """
        Persist a new approval chain definition.
        """
        db_chain = ApprovalChain(
            name=chain_in.name,
            trigger_condition=chain_in.trigger_condition,
            sequence=chain_in.sequence,
            is_active=chain_in.is_active,
        )
        self.session.add(db_chain)
        await self.session.flush()
        await self.session.refresh(db_chain)
        return db_chain

    async def update(
        self, db_chain: ApprovalChain, chain_in: ApprovalChainUpdate
    ) -> ApprovalChain:
        """
        Update an existing approval chain policy.
        """
        update_data = chain_in.model_dump(exclude_unset=True)
        for field, val in update_data.items():
            setattr(db_chain, field, val)

        self.session.add(db_chain)
        await self.session.flush()
        await self.session.refresh(db_chain)
        return db_chain

    async def delete(self, db_chain: ApprovalChain) -> None:
        """
        Delete an approval chain policy.
        """
        await self.session.delete(db_chain)
        await self.session.flush()
