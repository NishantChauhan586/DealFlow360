from datetime import datetime, timezone
from typing import List, Optional
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.models.product import ProductCategory
from app.models.warehouse import FulfillmentSplit, FulfillmentSplitStatus, Warehouse
from app.repositories.fulfillment_split_repository import FulfillmentSplitRepository
from app.repositories.inventory_repository import InventoryRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.quotation_repository import QuotationRepository
from app.repositories.warehouse_repository import WarehouseRepository
from app.schemas.warehouse import FulfillmentPlanResponse, FulfillmentSplitResponse
from app.services.quotation_service import log_audit_event

logger = structlog.get_logger(__name__)

BASE_SHIPPING_UNIT_RATE = 10.0  # Base cost per unit before warehouse distance weight


class WarehouseSplitter:
    """
    Deterministic fulfillment optimization engine executing cheapest-first greedy multi-warehouse stock allocation.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.order_repo = OrderRepository(session)
        self.quote_repo = QuotationRepository(session)
        self.inventory_repo = InventoryRepository(session)
        self.warehouse_repo = WarehouseRepository(session)
        self.split_repo = FulfillmentSplitRepository(session)

    async def suggest_split(
        self, order_id: uuid.UUID
    ) -> FulfillmentPlanResponse:
        """
        Greedy multi-warehouse fulfillment allocation algorithm:
        1. Fetch all order line items (from Order or Quotation).
        2. For each physical product:
           - Fetch inventory across active warehouses sorted by shipping_cost_weight ascending.
           - Available stock = on_hand - reserved.
           - Greedily allocate from cheapest warehouse first.
           - If stock is exhausted before demand is met, flag remainder as BACKORDERED.
        3. Persist FulfillmentSplit records and calculate total logistics shipping costs.
        """
        # Attempt to load Order first, then fallback to Quotation
        order_entity = await self.order_repo.get_by_id(order_id)
        lines = order_entity.lines if order_entity else None

        if not lines:
            quote = await self.quote_repo.get_by_id(order_id)
            if quote:
                lines = quote.lines

        if not lines:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order/Quotation with ID '{order_id}' was not found.",
            )

        splits_to_create: List[FulfillmentSplit] = []
        total_allocated = 0
        total_backordered = 0
        total_shipping_cost = 0.0
        explanations = []

        for line in lines:
            product = line.product
            product_name = product.name if product else "Product"
            needed_qty = line.quantity

            now = datetime.now(timezone.utc)
            # Non-physical items (Services and Subscriptions) are fulfilled digitally
            if product and product.category in (
                ProductCategory.SERVICE,
                ProductCategory.SUBSCRIPTION,
            ):
                split = FulfillmentSplit(
                    id=uuid.uuid4(),
                    order_id=order_id,
                    product_id=line.product_id,
                    warehouse_id=None,
                    allocated_quantity=needed_qty,
                    shipping_cost=0.0,
                    status=FulfillmentSplitStatus.FULFILLED,
                    created_at=now,
                    updated_at=now,
                )
                splits_to_create.append(split)
                total_allocated += needed_qty
                explanations.append(
                    f"{product.category.value.title()} '{product_name}': {needed_qty} units digital/service fulfillment (no warehouse shipping)."
                )
                continue

            # Physical Hardware: Fetch all warehouse stock sorted by cheapest shipping weight
            inventories = (
                await self.inventory_repo.list_by_product_cheapest_warehouses_first(
                    line.product_id
                )
            )

            remaining_qty = needed_qty
            for inv in inventories:
                if remaining_qty <= 0:
                    break

                warehouse: Optional[Warehouse] = inv.warehouse
                available = inv.available_quantity
                if available <= 0:
                    continue

                allocated = min(remaining_qty, available)
                weight = warehouse.shipping_cost_weight if warehouse else 1.0
                shipping = round(allocated * weight * BASE_SHIPPING_UNIT_RATE, 2)

                split = FulfillmentSplit(
                    id=uuid.uuid4(),
                    order_id=order_id,
                    product_id=line.product_id,
                    warehouse_id=inv.warehouse_id,
                    allocated_quantity=allocated,
                    shipping_cost=shipping,
                    status=FulfillmentSplitStatus.PENDING,
                    created_at=now,
                    updated_at=now,
                )
                splits_to_create.append(split)

                total_allocated += allocated
                total_shipping_cost += shipping
                remaining_qty -= allocated

                wh_name = warehouse.name if warehouse else "Warehouse"
                explanations.append(
                    f"Allocated {allocated}/{needed_qty} units of '{product_name}' from {wh_name} (weight: {weight}x, shipping: ${shipping:.2f})."
                )

            # If stock across all warehouses was insufficient, backorder the remainder
            if remaining_qty > 0:
                backorder_split = FulfillmentSplit(
                    id=uuid.uuid4(),
                    order_id=order_id,
                    product_id=line.product_id,
                    warehouse_id=None,
                    allocated_quantity=remaining_qty,
                    shipping_cost=0.0,
                    status=FulfillmentSplitStatus.BACKORDERED,
                    created_at=now,
                    updated_at=now,
                )
                splits_to_create.append(backorder_split)
                total_backordered += remaining_qty
                explanations.append(
                    f"BACKORDERED: {remaining_qty}/{needed_qty} units of '{product_name}' due to insufficient regional warehouse stock."
                )

        # Remove prior splits and persist newly computed plan
        await self.split_repo.delete_by_order(order_id)
        created_splits = await self.split_repo.create_many(splits_to_create)
        if self.session:
            await self.session.commit()


        is_fully_fulfillable = total_backordered == 0
        final_explanation = " ".join(explanations)

        sales_rep = order_entity.sales_rep_id if order_entity else (quote.sales_rep_id if quote else None)
        await log_audit_event(
            action="FULFILLMENT_SPLIT_CALCULATED",
            entity_type="Order",
            entity_id=order_id,
            user_id=sales_rep,
            payload={
                "total_allocated": total_allocated,
                "total_backordered": total_backordered,
                "total_shipping_cost": total_shipping_cost,
                "splits_count": len(created_splits),
            },
        )

        logger.info(
            "fulfillment_split_suggested",
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
            is_fully_fulfillable=is_fully_fulfillable,
            explanation=final_explanation,
        )


async def suggest_split(
    order_id: uuid.UUID,
    session: AsyncSession,
) -> FulfillmentPlanResponse:
    """Helper functional interface for calculating warehouse fulfillment split."""
    splitter = WarehouseSplitter(session)
    return await splitter.suggest_split(order_id)
