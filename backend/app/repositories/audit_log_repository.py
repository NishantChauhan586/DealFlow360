from datetime import datetime
from typing import List, Optional, Tuple
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.audit_log import AuditLog


class AuditLogRepository:
    """
    Data access repository for AuditLog records.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_log(self, audit_log: AuditLog) -> AuditLog:
        """
        Persist an audit log record.
        """
        self.session.add(audit_log)
        await self.session.flush()
        await self.session.refresh(audit_log)
        return audit_log

    async def list_logs(
        self,
        skip: int = 0,
        limit: int = 50,
        entity_type: Optional[str] = None,
        entity_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
    ) -> Tuple[List[AuditLog], int]:
        """
        List paginated audit logs with entity and user filters.
        """
        base_query = select(AuditLog)
        count_query = select(func.count()).select_from(AuditLog)

        if entity_type is not None:
            base_query = base_query.where(AuditLog.entity_type == entity_type)
            count_query = count_query.where(AuditLog.entity_type == entity_type)

        if entity_id is not None:
            base_query = base_query.where(AuditLog.entity_id == entity_id)
            count_query = count_query.where(AuditLog.entity_id == entity_id)

        if user_id is not None:
            base_query = base_query.where(AuditLog.user_id == user_id)
            count_query = count_query.where(AuditLog.user_id == user_id)

        total_res = await self.session.execute(count_query)
        total = total_res.scalar_one()

        stmt = (
            base_query.options(selectinload(AuditLog.user))
            .order_by(AuditLog.timestamp.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all()), total
