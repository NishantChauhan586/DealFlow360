from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.models.user import User
from app.schemas.user import LoginRequest, Token, UserResponse, UserCreate

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token, summary="User Authentication Login")
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticates user against local database credentials and issues JWT token.
    """
    stmt = select(User).where(User.email == payload.email.lower())
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/register", response_model=UserResponse, summary="Register New User")
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Registers a new internal team user or customer.
    """
    stmt = select(User).where(User.email == payload.email.lower())
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered.")

    hashed = get_password_hash(payload.password)
    new_user = User(
        email=payload.email.lower(),
        hashed_password=hashed,
        full_name=payload.full_name,
        role=payload.role,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return UserResponse.model_validate(new_user)
