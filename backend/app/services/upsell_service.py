from typing import List, Optional
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.models.product_pairing import ProductPairing
from app.repositories.product_pairing_repository import ProductPairingRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.quotation_repository import QuotationRepository
from app.schemas.upsell import (
    ProductPairingCreate,
    ProductPairingResponse,
    ProductPairingUpdate,
    UpsellSuggestionItem,
    UpsellSuggestionsResponse,
)
from app.services.pricing_service import PricingService

logger = structlog.get_logger(__name__)


class UpsellService:
    """
    Intelligent Upsell and Cross-sell recommendation service.
    
    Adheres to DealFlow360 Principles:
    1. RULES = TRUTH, AI = INTELLIGENCE: Suggestions recommend high-affinity products
       while strictly respecting deterministic min_margin_threshold limits.
    2. EXPLAIN EVERY IMPORTANT DECISION: Every suggestion provides a transparent explanation
       of affinity score, promotion status, and margin delta.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.quotation_repo = QuotationRepository(session)
        self.pairing_repo = ProductPairingRepository(session)
        self.pricing_service = PricingService(session)
        self.product_repo = ProductRepository(session)

    async def get_suggestions(
        self,
        quotation_id: uuid.UUID,
        customer_tier: Optional[str] = None,
        cost_factor: float = 0.60,
        limit: int = 5,
    ) -> UpsellSuggestionsResponse:
        """
        Generate ranked, margin-qualified upsell & cross-sell suggestions for a quotation.

        Algorithm:
        1. Fetch current quotation and identify all product IDs currently in the cart.
        2. Query active ProductPairings where source_product_id is in cart_product_ids.
           Ordered by: is_promoted DESC, co_purchase_score DESC.
        3. Exclude products already in the cart and deduplicate target recommendations.
        4. Calculate deterministic base price and estimated cost (default 60% of base price).
        5. Filter out suggestions where margin_percent < min_margin_threshold.
        6. Return top-N ranked suggestions with transparent business explanations.
        """
        quotation = await self.quotation_repo.get_by_id(quotation_id)
        if not quotation:
            logger.warning("quotation_not_found_for_upsell", quotation_id=str(quotation_id))
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quotation with ID '{quotation_id}' was not found.",
            )

        cart_product_ids = [line.product_id for line in quotation.lines if line.product_id]
        if not cart_product_ids:
            logger.info("empty_cart_no_suggestions", quotation_id=str(quotation_id))
            return UpsellSuggestionsResponse(
                quotation_id=quotation_id,
                cart_product_count=0,
                total_suggestions=0,
                suggestions=[],
            )

        # Retrieve candidate pairings for source items
        candidate_pairings = await self.pairing_repo.get_pairings_for_source_products(cart_product_ids)

        seen_target_ids = set(cart_product_ids)
        qualified_suggestions: List[UpsellSuggestionItem] = []

        for pairing in candidate_pairings:
            target_id = pairing.target_product_id
            if target_id in seen_target_ids:
                continue

            target_product = pairing.target_product
            if not target_product or not target_product.is_active:
                continue

            # Determine base price for target product
            base_price: float = 0.0
            try:
                price_resp = await self.pricing_service.calculate_price(
                    product_id=target_id,
                    customer_tier=customer_tier,
                )
                base_price = price_resp.base_price
            except HTTPException:
                # If tier lookup fails, fallback to direct query or catalog price
                continue

            # Compute margin financials
            cost_estimate = round(base_price * cost_factor, 2)
            margin_dollars = round(base_price - cost_estimate, 2)
            margin_percent = round((margin_dollars / base_price * 100.0), 2) if base_price > 0 else 0.0
            margin_delta = margin_dollars

            # Governance check: enforce minimum margin threshold
            if margin_percent < pairing.min_margin_threshold:
                logger.info(
                    "upsell_filtered_below_margin_threshold",
                    target_id=str(target_id),
                    margin_percent=margin_percent,
                    min_margin_threshold=pairing.min_margin_threshold,
                )
                continue

            # Build transparent explanation
            source_name = pairing.source_product.name if pairing.source_product else "Quote Item"
            affinity_pct = int(round(pairing.co_purchase_score * 100))

            if pairing.is_promoted:
                reason = (
                    f"Strategic Enterprise Add-on: Frequently bundled with {source_name} "
                    f"({affinity_pct}% co-purchase rate). Yields {margin_percent:.0f}% margin (+${margin_dollars:,.2f} profit)."
                )
            else:
                reason = (
                    f"High-Affinity Cross-Sell: Co-purchased {affinity_pct}% of the time alongside {source_name}. "
                    f"Yields {margin_percent:.0f}% margin (+${margin_dollars:,.2f} profit)."
                )

            suggestion_item = UpsellSuggestionItem(
                pairing_id=pairing.id,
                source_product_id=pairing.source_product_id,
                source_product_name=source_name,
                product_id=target_product.id,
                product_name=target_product.name,
                product_category=target_product.category,
                product_description=target_product.description,
                unit=target_product.unit,
                base_price=base_price,
                cost_estimate=cost_estimate,
                margin_dollars=margin_dollars,
                margin_percent=margin_percent,
                margin_delta=margin_delta,
                co_purchase_score=pairing.co_purchase_score,
                is_promoted=pairing.is_promoted,
                reason=reason,
            )

            qualified_suggestions.append(suggestion_item)
            seen_target_ids.add(target_id)

            if len(qualified_suggestions) >= limit:
                break

        logger.info(
            "upsell_suggestions_generated",
            quotation_id=str(quotation_id),
            cart_products=len(cart_product_ids),
            suggestions_count=len(qualified_suggestions),
        )

        return UpsellSuggestionsResponse(
            quotation_id=quotation_id,
            cart_product_count=len(cart_product_ids),
            total_suggestions=len(qualified_suggestions),
            suggestions=qualified_suggestions,
        )

    # --------------------------------------------------------------------------
    # Admin CRUD for Product Pairing Rules
    # --------------------------------------------------------------------------

    async def list_pairings(
        self,
        page: int = 1,
        page_size: int = 50,
        source_product_id: Optional[uuid.UUID] = None,
        is_promoted: Optional[bool] = None,
    ) -> List[ProductPairingResponse]:
        """
        List configured product pairings.
        """
        skip = (page - 1) * page_size
        pairings, _ = await self.pairing_repo.list_pairings(
            skip=skip,
            limit=page_size,
            source_product_id=source_product_id,
            is_promoted=is_promoted,
        )
        return [ProductPairingResponse.model_validate(p) for p in pairings]

    async def create_pairing(self, pairing_in: ProductPairingCreate) -> ProductPairingResponse:
        """
        Configure a new product pairing.
        """
        existing = await self.pairing_repo.get_by_source_and_target(
            pairing_in.source_product_id,
            pairing_in.target_product_id,
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A pairing between this source and target product already exists.",
            )

        pairing = await self.pairing_repo.create(pairing_in)
        await self.session.commit()
        return ProductPairingResponse.model_validate(pairing)

    async def update_pairing(
        self, pairing_id: uuid.UUID, pairing_in: ProductPairingUpdate
    ) -> ProductPairingResponse:
        """
        Update an existing product pairing.
        """
        pairing = await self.pairing_repo.get_by_id(pairing_id)
        if not pairing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"ProductPairing with ID '{pairing_id}' was not found.",
            )

        updated = await self.pairing_repo.update(pairing, pairing_in)
        await self.session.commit()
        return ProductPairingResponse.model_validate(updated)

    async def delete_pairing(self, pairing_id: uuid.UUID) -> None:
        """
        Delete a product pairing rule.
        """
        pairing = await self.pairing_repo.get_by_id(pairing_id)
        if not pairing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"ProductPairing with ID '{pairing_id}' was not found.",
            )

        await self.pairing_repo.delete(pairing)
        await self.session.commit()
