from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr
from pydantic.alias_generators import to_camel

base_config = ConfigDict(
    from_attributes=True,
    populate_by_name=True,
    alias_generator=to_camel,
)


class UserBase(BaseModel):
    model_config = base_config

    email: EmailStr
    full_name: str
    role: str = "sales_rep"


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    is_superuser: bool


class Token(BaseModel):
    model_config = base_config

    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class LoginRequest(BaseModel):
    model_config = base_config

    email: EmailStr
    password: str

