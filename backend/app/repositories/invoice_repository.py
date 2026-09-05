from typing import List, Optional
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.subscription import CreditNote, Invoice


class InvoiceRepository:
    """
    Data access repository for Invoices and Credit Notes.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, invoice_id: uuid.UUID) -> Optional[Invoice]:
        stmt = (
            select(Invoice)
            .where(Invoice.id == invoice_id)
            .options(selectinload(Invoice.credit_notes))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_order(self, order_id: uuid.UUID) -> List[Invoice]:
        stmt = (
            select(Invoice)
            .where(Invoice.order_id == order_id)
            .options(selectinload(Invoice.credit_notes))
            .order_by(Invoice.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_credit_notes_by_order(
        self, order_id: uuid.UUID
    ) -> List[CreditNote]:
        stmt = (
            select(CreditNote)
            .join(Invoice, CreditNote.invoice_id == Invoice.id, isouter=True)
            .where(Invoice.order_id == order_id)
            .order_by(CreditNote.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, invoice: Invoice) -> Invoice:
        self.session.add(invoice)
        await self.session.flush()
        await self.session.refresh(invoice, ["credit_notes"])
        return invoice
