from typing import List
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.models.warehouse import FulfillmentSplit, FulfillmentSplitStatus
from app.repositories.fulfillment_split_repository import FulfillmentSplitRepository
from app.repositories.quotation_repository import QuotationRepository
from app.repositories.warehouse_repository import WarehouseRepository
from app.schemas.warehouse import (
    FulfillmentOverrideRequest,
    FulfillmentPlanResponse,
    FulfillmentSplitResponse,
)
from app.services.quotation_service import log_audit_event
from app.services.warehouse_splitter import BASE_SHIPPING_UNIT_RATE

logger = structlog.get_logger(__name__)


class FulfillmentOverrideService:
    """
    Service allowing sales operations managers to manually override warehouse allocation splits and logistics assignments.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.quote_repo = QuotationRepository(session)
        self.warehouse_repo = WarehouseRepository(session)
        self.split_repo = FulfillmentSplitRepository(session)

    async def apply_manual_override(
        self,
        order_id: uuid.UUID,
        override_req: FulfillmentOverrideRequest,
    ) -> FulfillmentPlanResponse:
        """
        Manually adjust allocations across warehouses, reset prior splits, and recalculate shipping costs.
        """
        quote = await self.quote_repo.get_by_id(order_id)
        if not quote:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order/Quotation with ID '{order_id}' was not found.",
            )

        splits_to_create: List[FulfillmentSplit] = []
        total_allocated = 0
        total_backordered = 0
        total_shipping_cost = 0.0
        explanations = []

        for item in override_req.overrides:
            shipping_cost = 0.0
            split_status = item.status or (
                FulfillmentSplitStatus.PENDING
                if item.warehouse_id
                else FulfillmentSplitStatus.BACKORDERED
            )

            if item.warehouse_id and split_status != FulfillmentSplitStatus.BACKORDERED:
                wh = await self.warehouse_repo.get_by_id(item.warehouse_id)
                if not wh:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Warehouse with ID '{item.warehouse_id}' was not found.",
                    )
                weight = wh.shipping_cost_weight
                shipping_cost = round(item.allocated_quantity * weight * BASE_SHIPPING_UNIT_RATE, 2)
                total_allocated += item.allocated_quantity
                total_shipping_cost += shipping_cost
                explanations.append(
                    f"Manually assigned {item.allocated_quantity} units to {wh.name} (shipping: ${shipping_cost:.2f})."
                )
            else:
                total_backordered += item.allocated_quantity
                explanations.append(
                    f"Manually flagged {item.allocated_quantity} units as BACKORDERED."
                )

            split = FulfillmentSplit(
                order_id=order_id,
                product_id=item.product_id,
                warehouse_id=item.warehouse_id,
                allocated_quantity=item.allocated_quantity,
                shipping_cost=shipping_cost,
                status=split_status,
            )
            splits_to_create.append(split)

        # Reset prior splits and persist overrides
        await self.split_repo.delete_by_order(order_id)
        created_splits = await self.split_repo.create_many(splits_to_create)
        await self.session.commit()

        explanation = "Manual override applied: " + " ".join(explanations)

        await log_audit_event(
            action="FULFILLMENT_MANUAL_OVERRIDE_APPLIED",
            entity_type="Quotation",
            entity_id=order_id,
            user_id=quote.sales_rep_id,
            payload={
                "overrides_count": len(override_req.overrides),
                "total_allocated": total_allocated,
                "total_backordered": total_backordered,
                "total_shipping_cost": total_shipping_cost,
            },
        )

        logger.info(
            "fulfillment_override_applied",
            order_id=str(order_id),
            total_allocated=total_allocated,
            total_backordered=total_backordered,
            shipping_cost=total_shipping_cost,
        )

        return FulfillmentPlanResponse(
            order_id=order_id,
            splits=[
                FulfillmentSplitResponse.model_validate(s) for s in created_splits
            ],
            total_allocated=total_allocated,
            total_backordered=total_backordered,
            total_shipping_cost=round(total_shipping_cost, 2),
            is_fully_fulfillable=total_backordered == 0,
            explanation=explanation,
        )
