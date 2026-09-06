from datetime import datetime, timezone
from typing import Any, Dict, Optional
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.core.events import event_bus
from app.models.audit_log import AuditLog
from app.repositories.audit_log_repository import AuditLogRepository
from app.schemas.audit_log import AuditLogListResponse, AuditLogResponse

logger = structlog.get_logger(__name__)


class AuditService:
    """
    Centralized Enterprise Audit Trail Service.
    Guarantees immutable logging across quotation creation, edits, risk evaluations,
    approvals, customer negotiations, and order conversions.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.audit_repo = AuditLogRepository(session)

    async def log_event(
        self,
        entity_type: str,
        entity_id: Optional[uuid.UUID],
        action: str,
        user_id: Optional[uuid.UUID] = None,
        old_value: Optional[Dict[str, Any]] = None,
        new_value: Optional[Dict[str, Any]] = None,
        reason: Optional[str] = None,
    ) -> AuditLog:
        """
        Record an immutable system audit log entry.
        """
        audit_log = AuditLog(
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            old_value=old_value or {},
            new_value=new_value or {},
            user_id=user_id,
            reason=reason,
            timestamp=datetime.now(timezone.utc),
        )

        created = await self.audit_repo.create_log(audit_log)

        # Dispatch async event for telemetry / compliance auditing
        await event_bus.publish(
            "audit.event_logged",
            {
                "audit_id": str(created.id),
                "entity_type": entity_type,
                "entity_id": str(entity_id) if entity_id else None,
                "action": action,
                "user_id": str(user_id) if user_id else None,
                "reason": reason,
            },
        )

        logger.info(
            "audit_trail_recorded",
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id else None,
            action=action,
            user_id=str(user_id) if user_id else None,
        )

        return created

    async def list_logs(
        self,
        page: int = 1,
        page_size: int = 50,
        entity_type: Optional[str] = None,
        entity_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
    ) -> AuditLogListResponse:
        """
        Retrieve paginated audit logs.
        """
        skip = (page - 1) * page_size
        logs, total = await self.audit_repo.list_logs(
            skip=skip,
            limit=page_size,
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user_id,
        )
        return AuditLogListResponse(
            items=[AuditLogResponse.model_validate(l) for l in logs],
            total=total,
            page=page,
            page_size=page_size,
        )
