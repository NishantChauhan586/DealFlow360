from typing import List, Optional, Tuple
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.quotation import Quotation, QuotationLine, QuotationStatus
from app.schemas.quotation import QuotationCreate, QuotationUpdate


class QuotationRepository:
    """
    Data access repository for Quotation entities.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, quotation_id: uuid.UUID) -> Optional[Quotation]:
        """
        Fetch a quotation by primary key with eagerly loaded lines and related products/variants.
        """
        stmt = (
            select(Quotation)
            .where(Quotation.id == quotation_id)
            .options(
                selectinload(Quotation.lines).selectinload(QuotationLine.product),
                selectinload(Quotation.lines).selectinload(QuotationLine.variant),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_quotations(
        self,
        skip: int = 0,
        limit: int = 20,
        status: Optional[QuotationStatus] = None,
        sales_rep_id: Optional[uuid.UUID] = None,
        customer_id: Optional[uuid.UUID] = None,
    ) -> Tuple[List[Quotation], int]:
        """
        Retrieve paginated quotations with optional lifecycle status and owner filters.
        """
        base_query = select(Quotation)
        count_query = select(func.count()).select_from(Quotation)

        if status is not None:
            base_query = base_query.where(Quotation.status == status)
            count_query = count_query.where(Quotation.status == status)

        if sales_rep_id is not None:
            base_query = base_query.where(Quotation.sales_rep_id == sales_rep_id)
            count_query = count_query.where(Quotation.sales_rep_id == sales_rep_id)

        if customer_id is not None:
            base_query = base_query.where(Quotation.customer_id == customer_id)
            count_query = count_query.where(Quotation.customer_id == customer_id)

        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        stmt = (
            base_query.options(
                selectinload(Quotation.lines).selectinload(QuotationLine.product),
                selectinload(Quotation.lines).selectinload(QuotationLine.variant),
            )
            .order_by(Quotation.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        items = list(result.scalars().all())

        return items, total

    async def create(
        self, quotation_in: QuotationCreate, sales_rep_id: uuid.UUID
    ) -> Quotation:
        """
        Create a new draft Quotation record.
        """
        db_quotation = Quotation(
            customer_id=quotation_in.customer_id,
            sales_rep_id=sales_rep_id,
            status=QuotationStatus.DRAFT,
            total_amount=0.0,
            discount_total=0.0,
            expires_at=quotation_in.expires_at,
        )
        self.session.add(db_quotation)
        await self.session.flush()
        await self.session.refresh(db_quotation, ["lines"])
        return db_quotation

    async def update(
        self, db_quotation: Quotation, quotation_in: QuotationUpdate
    ) -> Quotation:
        """
        Apply partial updates to a quotation header.
        """
        update_data = quotation_in.model_dump(exclude_unset=True)
        for field, val in update_data.items():
            setattr(db_quotation, field, val)

        self.session.add(db_quotation)
        await self.session.flush()
        await self.session.refresh(db_quotation, ["lines"])
        return db_quotation

    async def save(self, db_quotation: Quotation) -> Quotation:
        """
        Save changes on a quotation and refresh state.
        """
        self.session.add(db_quotation)
        await self.session.flush()
        await self.session.refresh(db_quotation, ["lines"])
        return db_quotation

    async def delete(self, db_quotation: Quotation) -> None:
        """
        Delete a quotation record.
        """
        await self.session.delete(db_quotation)
        await self.session.flush()
