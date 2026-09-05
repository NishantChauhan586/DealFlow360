from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


class ApprovalChainBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Descriptive approval chain name")
    trigger_condition: Dict[str, Any] = Field(
        default_factory=dict,
        description="Rule trigger payload (e.g. {'min_risk': 3.0, 'max_risk': 6.9})",
    )
    sequence: List[str] = Field(
        default_factory=list,
        description="Sequential list of approver roles in required order (e.g. ['sales_manager', 'finance'])",
    )
    is_active: bool = Field(default=True, description="Whether this approval policy is currently active")


class ApprovalChainCreate(ApprovalChainBase):
    pass


class ApprovalChainUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    trigger_condition: Optional[Dict[str, Any]] = None
    sequence: Optional[List[str]] = None
    is_active: Optional[bool] = None


class ApprovalChainResponse(ApprovalChainBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class ApprovalChainListResponse(BaseModel):
    items: List[ApprovalChainResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ApprovalChainResolveRequest(BaseModel):
    brs_score: float = Field(..., ge=0.0, le=100.0, description="Business Risk Score of the quote (0.0 to 10.0 or 100.0)")


class ApprovalChainResolveResponse(BaseModel):
    brs_score: float
    approval_required: bool
    chain_id: Optional[uuid.UUID]
    chain_name: Optional[str]
    sequence: List[str]
    trigger_condition: Optional[Dict[str, Any]]
    explanation: str = Field(
        ...,
        description="Clear explanation of why this chain was selected, required roles, and next steps",
    )
