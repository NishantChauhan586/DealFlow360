from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.subscription import SubscriptionContract
from app.schemas.subscription import SubscriptionResponse

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions & Billing"])


@router.get("", response_model=List[SubscriptionResponse], summary="List Active Subscriptions")
async def list_subscriptions(db: AsyncSession = Depends(get_db)):
    """
    Returns active recurring contracts, ARR, MRR, and renewal schedules.
    """
    stmt = select(SubscriptionContract).order_by(SubscriptionContract.created_at.desc())
    res = await db.execute(stmt)
    return list(res.scalars().all())
