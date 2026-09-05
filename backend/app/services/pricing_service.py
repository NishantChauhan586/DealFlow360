from datetime import datetime, timezone
import math
from typing import Optional
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.models.price_list import PriceList
from app.repositories.price_list_repository import PriceListRepository
from app.repositories.product_repository import ProductRepository
from app.schemas.price_list import (
    PriceListCreate,
    PriceListListResponse,
    PriceListResponse,
    PriceListUpdate,
    PriceLookupResponse,
)

logger = structlog.get_logger(__name__)


class PricingService:
    """
    Business service layer executing price list management and deterministic tier-based pricing resolution.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.price_repo = PriceListRepository(session)
        self.product_repo = ProductRepository(session)

    async def get_price_list_or_404(self, price_list_id: uuid.UUID) -> PriceList:
        """
        Fetch a PriceList entry by primary key or raise 404.
        """
        price_list = await self.price_repo.get_by_id(price_list_id)
        if not price_list:
            logger.warning("price_list_not_found", price_list_id=str(price_list_id))
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"PriceList with ID '{price_list_id}' was not found.",
            )
        return price_list

    async def list_price_lists(
        self,
        page: int = 1,
        page_size: int = 20,
        product_id: Optional[uuid.UUID] = None,
        customer_tier: Optional[str] = None,
    ) -> PriceListListResponse:
        """
        Retrieve paginated list of price list entries.
        """
        if page < 1:
            page = 1
        if page_size < 1 or page_size > 100:
            page_size = 20

        skip = (page - 1) * page_size
        items, total = await self.price_repo.list_price_lists(
            skip=skip,
            limit=page_size,
            product_id=product_id,
            customer_tier=customer_tier,
        )

        total_pages = math.ceil(total / page_size) if total > 0 else 1

        return PriceListListResponse(
            items=[PriceListResponse.model_validate(p) for p in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    async def create_price_list(self, price_list_in: PriceListCreate) -> PriceList:
        """
        Validate and create a new price schedule entry.
        """
        if price_list_in.product_id is not None:
            product = await self.product_repo.get_by_id(price_list_in.product_id)
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Associated Product ID '{price_list_in.product_id}' does not exist.",
                )

        price_list = await self.price_repo.create(price_list_in)
        await self.session.commit()
        logger.info(
            "price_list_created",
            price_list_id=str(price_list.id),
            tier=price_list.customer_tier,
            product_id=str(price_list.product_id),
            base_price=price_list.base_price,
        )
        return price_list

    async def update_price_list(
        self, price_list_id: uuid.UUID, price_list_in: PriceListUpdate
    ) -> PriceList:
        """
        Update an existing price list entry.
        """
        price_list = await self.get_price_list_or_404(price_list_id)

        if price_list_in.product_id is not None:
            product = await self.product_repo.get_by_id(price_list_in.product_id)
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Associated Product ID '{price_list_in.product_id}' does not exist.",
                )

        updated = await self.price_repo.update(price_list, price_list_in)
        await self.session.commit()
        logger.info("price_list_updated", price_list_id=str(price_list_id))
        return updated

    async def delete_price_list(self, price_list_id: uuid.UUID) -> None:
        """
        Delete a price list entry.
        """
        price_list = await self.get_price_list_or_404(price_list_id)
        await self.price_repo.delete(price_list)
        await self.session.commit()
        logger.info("price_list_deleted", price_list_id=str(price_list_id))

    async def calculate_price(
        self,
        product_id: uuid.UUID,
        customer_tier: Optional[str] = None,
        as_of_date: Optional[datetime] = None,
    ) -> PriceLookupResponse:
        """
        Deterministic Multi-Tier Price Lookup Rule:
        1. Exact Match: product_id + customer_tier active at as_of_date
        2. Tier-Wide Fallback: customer_tier with product_id is NULL active at as_of_date
        3. Product Default: product_id with customer_tier is NULL active at as_of_date
        4. Global Default: customer_tier is NULL + product_id is NULL active at as_of_date
        """
        as_of = as_of_date or datetime.now(timezone.utc)
        if as_of.tzinfo is None:
            as_of = as_of.replace(tzinfo=timezone.utc)

        # Validate product exists and is active
        product = await self.product_repo.get_by_id(product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID '{product_id}' was not found.",
            )

        if not product.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product '{product.name}' is inactive and cannot be priced.",
            )

        # Retrieve all candidate price lists effective at the timestamp
        candidates = await self.price_repo.find_effective_prices(product_id, as_of)
        clean_tier = customer_tier.strip().lower() if customer_tier else None

        resolved_entry: Optional[PriceList] = None
        match_strategy: str = ""

        # Step 1: Exact Match (Product + Tier)
        if clean_tier:
            for entry in candidates:
                if (
                    entry.product_id == product_id
                    and entry.customer_tier
                    and entry.customer_tier.lower() == clean_tier
                ):
                    resolved_entry = entry
                    match_strategy = "exact_product_tier"
                    break

        # Step 2: Tier-Wide Fallback (Tier only, Product is NULL)
        if not resolved_entry and clean_tier:
            for entry in candidates:
                if (
                    entry.product_id is None
                    and entry.customer_tier
                    and entry.customer_tier.lower() == clean_tier
                ):
                    resolved_entry = entry
                    match_strategy = "tier_fallback"
                    break

        # Step 3: Product Default (Product matched, Tier is NULL)
        if not resolved_entry:
            for entry in candidates:
                if entry.product_id == product_id and entry.customer_tier is None:
                    resolved_entry = entry
                    match_strategy = "product_default"
                    break

        # Step 4: Global Default (Both Product and Tier are NULL)
        if not resolved_entry:
            for entry in candidates:
                if entry.product_id is None and entry.customer_tier is None:
                    resolved_entry = entry
                    match_strategy = "default_catalog"
                    break

        if not resolved_entry:
            logger.warning(
                "no_effective_price_found",
                product_id=str(product_id),
                tier=customer_tier,
                as_of=as_of.isoformat(),
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"No active price list found for product '{product.name}' "
                    f"under tier '{customer_tier or 'default'}' as of {as_of.isoformat()}."
                ),
            )

        logger.info(
            "price_resolved",
            product_id=str(product_id),
            tier=customer_tier,
            base_price=resolved_entry.base_price,
            strategy=match_strategy,
        )

        return PriceLookupResponse(
            product_id=product.id,
            product_name=product.name,
            customer_tier=customer_tier,
            base_price=resolved_entry.base_price,
            currency=resolved_entry.currency,
            resolved_price_list_id=resolved_entry.id,
            resolved_price_list_name=resolved_entry.name,
            match_strategy=match_strategy,
            as_of_date=as_of,
        )
