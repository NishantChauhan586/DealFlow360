from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


class AuditLogResponse(BaseModel):
    id: uuid.UUID
    entity_type: str
    entity_id: Optional[uuid.UUID] = None
    action: str
    old_value: dict = Field(default_factory=dict)
    new_value: dict = Field(default_factory=dict)
    user_id: Optional[uuid.UUID] = None
    reason: Optional[str] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditLogListResponse(BaseModel):
    items: List[AuditLogResponse]
    total: int
    page: int
    page_size: int
