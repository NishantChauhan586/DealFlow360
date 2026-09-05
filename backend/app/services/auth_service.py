from datetime import timedelta
from typing import Optional
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.core.config import settings
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, TokenResponse, UserCreate, UserResponse

logger = structlog.get_logger(__name__)


class AuthService:
    """
    Authentication & User Management service for RBAC and Customer Portal access.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.user_repo = UserRepository(session)

    async def authenticate(self, login_in: LoginRequest) -> TokenResponse:
        """
        Authenticate user credentials and issue signed JWT with role & customer context.
        """
        user = await self.user_repo.get_by_email(login_in.email)
        if not user or not verify_password(login_in.password, user.hashed_password):
            logger.warning("auth_failed_invalid_credentials", email=login_in.email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account has been deactivated.",
            )

        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "customer_id": str(user.customer_id) if user.customer_id else None,
        }

        access_token = create_access_token(
            data=token_data,
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        )

        logger.info("auth_successful", user_id=str(user.id), role=user.role, email=user.email)

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user_id=user.id,
            email=user.email,
            role=user.role,
            customer_id=user.customer_id,
        )

    async def register_user(self, user_in: UserCreate) -> UserResponse:
        """
        Create a new user account.
        """
        existing = await self.user_repo.get_by_email(user_in.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"User with email '{user_in.email}' already exists.",
            )

        user = User(
            email=user_in.email.strip().lower(),
            hashed_password=get_password_hash(user_in.password),
            full_name=user_in.full_name,
            role=user_in.role.strip().lower(),
            customer_id=user_in.customer_id,
            is_active=True,
        )
        created = await self.user_repo.create(user)
        await self.session.commit()
        return UserResponse.model_validate(created)
