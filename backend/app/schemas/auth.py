from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="User login email address")
    password: str = Field(..., min_length=4, description="User account password")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: uuid.UUID
    email: str
    role: str
    customer_id: Optional[uuid.UUID] = None


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "customer"
    customer_id: Optional[uuid.UUID] = None


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    customer_id: Optional[uuid.UUID] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
