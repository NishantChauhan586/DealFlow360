from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.quotation import QuotationLine


class QuotationLineRepository:
    """
    Data access repository for QuotationLine items.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, line_id: uuid.UUID) -> Optional[QuotationLine]:
        """
        Fetch a single quotation line item with product and variant relationships.
        """
        stmt = (
            select(QuotationLine)
            .where(QuotationLine.id == line_id)
            .options(
                selectinload(QuotationLine.product),
                selectinload(QuotationLine.variant),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_quotation(
        self, quotation_id: uuid.UUID
    ) -> List[QuotationLine]:
        """
        List all line items belonging to a quotation.
        """
        stmt = (
            select(QuotationLine)
            .where(QuotationLine.quotation_id == quotation_id)
            .options(
                selectinload(QuotationLine.product),
                selectinload(QuotationLine.variant),
            )
            .order_by(QuotationLine.created_at.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, line: QuotationLine) -> QuotationLine:
        """
        Persist a new quotation line item.
        """
        self.session.add(line)
        await self.session.flush()
        await self.session.refresh(line, ["product", "variant"])
        return line

    async def update(
        self, db_line: QuotationLine, updates: Dict[str, Any]
    ) -> QuotationLine:
        """
        Apply attribute updates to a quotation line.
        """
        for field, val in updates.items():
            setattr(db_line, field, val)

        self.session.add(db_line)
        await self.session.flush()
        await self.session.refresh(db_line, ["product", "variant"])
        return db_line

    async def delete(self, db_line: QuotationLine) -> None:
        """
        Delete a quotation line item.
        """
        await self.session.delete(db_line)
        await self.session.flush()
