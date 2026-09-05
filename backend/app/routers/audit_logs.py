from typing import Optional
import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.audit_log import AuditLogListResponse
from app.services.audit_service import AuditService

router = APIRouter(prefix="/audit-logs", tags=["Audit Trail & Governance"])


@router.get(
    "",
    response_model=AuditLogListResponse,
    summary="List immutable system audit logs with entity and user filters",
)
async def list_audit_logs(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=50, ge=1, le=100, description="Items per page"),
    entity_type: Optional[str] = Query(default=None, description="Filter by entity type (e.g., 'quotation', 'approval', 'order')"),
    entity_id: Optional[uuid.UUID] = Query(default=None, description="Filter by specific entity UUID"),
    user_id: Optional[uuid.UUID] = Query(default=None, description="Filter by mutating user UUID"),
    session: AsyncSession = Depends(get_db),
) -> AuditLogListResponse:
    """
    Retrieve paginated immutable audit logs documenting all lifecycle changes and governance actions.
    """
    service = AuditService(session)
    return await service.list_logs(
        page=page,
        page_size=page_size,
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
    )
