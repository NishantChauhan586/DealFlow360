from datetime import datetime, timezone
from typing import List, Optional, Tuple
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.alert import Alert, AlertSeverity, AlertType


class AlertRepository:
    """
    Data access repository for Deal Health Alert records.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, alert_id: uuid.UUID) -> Optional[Alert]:
        stmt = (
            select(Alert)
            .where(Alert.id == alert_id)
            .options(
                selectinload(Alert.quotation),
                selectinload(Alert.order),
                selectinload(Alert.resolver),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def find_existing_unresolved(
        self, alert_type: AlertType, quotation_id: uuid.UUID
    ) -> Optional[Alert]:
        """
        Check if an active, unresolved alert of the same type already exists for a quotation.
        """
        stmt = select(Alert).where(
            Alert.type == alert_type,
            Alert.quotation_id == quotation_id,
            Alert.resolved_at.is_(None),
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_alerts(
        self,
        skip: int = 0,
        limit: int = 50,
        unresolved_only: bool = True,
        alert_type: Optional[AlertType] = None,
        severity: Optional[AlertSeverity] = None,
    ) -> Tuple[List[Alert], int]:
        base_query = select(Alert)
        count_query = select(func.count()).select_from(Alert)

        if unresolved_only:
            base_query = base_query.where(Alert.resolved_at.is_(None))
            count_query = count_query.where(Alert.resolved_at.is_(None))

        if alert_type is not None:
            base_query = base_query.where(Alert.type == alert_type)
            count_query = count_query.where(Alert.type == alert_type)

        if severity is not None:
            base_query = base_query.where(Alert.severity == severity)
            count_query = count_query.where(Alert.severity == severity)

        total_res = await self.session.execute(count_query)
        total = total_res.scalar_one()

        stmt = (
            base_query.options(
                selectinload(Alert.quotation),
                selectinload(Alert.order),
            )
            .order_by(Alert.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all()), total

    async def create_alert(self, alert: Alert) -> Alert:
        self.session.add(alert)
        await self.session.flush()
        await self.session.refresh(alert)
        return alert

    async def resolve_alert(
        self, alert: Alert, resolved_by: Optional[uuid.UUID] = None
    ) -> Alert:
        alert.resolved_at = datetime.now(timezone.utc)
        alert.resolved_by = resolved_by
        self.session.add(alert)
        await self.session.flush()
        await self.session.refresh(alert)
        return alert

    async def count_unresolved_by_type(self, alert_type: AlertType) -> int:
        stmt = select(func.count()).select_from(Alert).where(
            Alert.type == alert_type,
            Alert.resolved_at.is_(None),
        )
        result = await self.session.execute(stmt)
        return result.scalar_one()

    async def count_unresolved_by_severity(self, severity: AlertSeverity) -> int:
        stmt = select(func.count()).select_from(Alert).where(
            Alert.severity == severity,
            Alert.resolved_at.is_(None),
        )
        result = await self.session.execute(stmt)
        return result.scalar_one()
