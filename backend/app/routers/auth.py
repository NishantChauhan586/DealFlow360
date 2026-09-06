from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.auth import LoginRequest, TokenResponse, UserCreate, UserResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication & Access"])


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate user and issue JWT token",
)
async def login(
    login_in: LoginRequest,
    session: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Authenticate with email and password.
    Returns access token with user role and optional customer_id claim.
    """
    service = AuthService(session)
    return await service.authenticate(login_in)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register(
    user_in: UserCreate,
    session: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Create a new user account (e.g. customer contact or sales rep).
    """
    service = AuthService(session)
    return await service.register_user(user_in)
