import math
from typing import Optional
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.models.discount_tier import DiscountTier
from app.models.product import ProductCategory
from app.repositories.discount_tier_repository import DiscountTierRepository
from app.schemas.discount_tier import (
    DiscountLimitLookupResponse,
    DiscountTierCreate,
    DiscountTierListResponse,
    DiscountTierResponse,
    DiscountTierUpdate,
)

logger = structlog.get_logger(__name__)


class DiscountConfigService:
    """
    Business service layer managing discount tier configurations and deterministic discount limit enforcement.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.tier_repo = DiscountTierRepository(session)

    async def get_tier_or_404(self, tier_id: uuid.UUID) -> DiscountTier:
        """
        Fetch a discount tier by ID or raise 404 HTTPException.
        """
        tier = await self.tier_repo.get_by_id(tier_id)
        if not tier:
            logger.warning("discount_tier_not_found", tier_id=str(tier_id))
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"DiscountTier with ID '{tier_id}' was not found.",
            )
        return tier

    async def list_discount_tiers(
        self,
        page: int = 1,
        page_size: int = 20,
        customer_tier: Optional[str] = None,
        category: Optional[ProductCategory] = None,
    ) -> DiscountTierListResponse:
        """
        List paginated discount tier configuration rules.
        """
        if page < 1:
            page = 1
        if page_size < 1 or page_size > 100:
            page_size = 20

        skip = (page - 1) * page_size
        items, total = await self.tier_repo.list_discount_tiers(
            skip=skip,
            limit=page_size,
            customer_tier=customer_tier,
            category=category,
        )

        total_pages = math.ceil(total / page_size) if total > 0 else 1

        return DiscountTierListResponse(
            items=[DiscountTierResponse.model_validate(t) for t in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    async def create_discount_tier(
        self, tier_in: DiscountTierCreate
    ) -> DiscountTier:
        """
        Validate uniqueness and create a new discount ceiling rule.
        """
        existing = await self.tier_repo.get_by_tier_and_category(
            tier_in.customer_tier, tier_in.category
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"A discount ceiling rule already exists for customer tier "
                    f"'{tier_in.customer_tier}' and category '{tier_in.category}'."
                ),
            )

        tier = await self.tier_repo.create(tier_in)
        await self.session.commit()
        logger.info(
            "discount_tier_created",
            tier_id=str(tier.id),
            customer_tier=tier.customer_tier,
            category=tier.category,
            max_discount=tier.max_discount_percent,
        )
        return tier

    async def update_discount_tier(
        self, tier_id: uuid.UUID, tier_in: DiscountTierUpdate
    ) -> DiscountTier:
        """
        Update an existing discount tier rule.
        """
        tier = await self.get_tier_or_404(tier_id)

        # If changing tier or category, verify unique constraint
        new_customer_tier = (
            tier_in.customer_tier.lower()
            if tier_in.customer_tier
            else tier.customer_tier
        )
        new_category = tier_in.category if tier_in.category else tier.category

        if (
            new_customer_tier != tier.customer_tier
            or new_category != tier.category
        ):
            existing = await self.tier_repo.get_by_tier_and_category(
                new_customer_tier, new_category
            )
            if existing and existing.id != tier.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"A discount ceiling rule already exists for customer tier "
                        f"'{new_customer_tier}' and category '{new_category}'."
                    ),
                )

        updated = await self.tier_repo.update(tier, tier_in)
        await self.session.commit()
        logger.info("discount_tier_updated", tier_id=str(tier_id))
        return updated

    async def delete_discount_tier(self, tier_id: uuid.UUID) -> None:
        """
        Delete a discount tier rule.
        """
        tier = await self.get_tier_or_404(tier_id)
        await self.tier_repo.delete(tier)
        await self.session.commit()
        logger.info("discount_tier_deleted", tier_id=str(tier_id))

    async def get_discount_limit(
        self, customer_tier: str, category: ProductCategory
    ) -> DiscountLimitLookupResponse:
        """
        Deterministic lookup for maximum allowed discount percent for a given (customer_tier, category).
        """
        clean_tier = customer_tier.strip().lower()
        matched_tier = await self.tier_repo.get_by_tier_and_category(
            clean_tier, category
        )

        if matched_tier:
            return DiscountLimitLookupResponse(
                customer_tier=clean_tier,
                category=category,
                max_discount_percent=matched_tier.max_discount_percent,
                matched_tier_id=matched_tier.id,
                matched_tier_name=matched_tier.name,
                rule_applied="exact_tier_category_match",
            )

        # Fallback to standard base tier (e.g. bronze or default 0.0%)
        default_tier = await self.tier_repo.get_by_tier_and_category(
            "bronze", category
        )
        if default_tier:
            return DiscountLimitLookupResponse(
                customer_tier=clean_tier,
                category=category,
                max_discount_percent=default_tier.max_discount_percent,
                matched_tier_id=default_tier.id,
                matched_tier_name=default_tier.name,
                rule_applied="bronze_fallback_default",
            )

        # Absolute default fallback
        return DiscountLimitLookupResponse(
            customer_tier=clean_tier,
            category=category,
            max_discount_percent=0.0,
            matched_tier_id=None,
            matched_tier_name=None,
            rule_applied="zero_discount_catalog_safety_default",
        )
