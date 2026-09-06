from typing import Dict, Optional
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.models.product import ProductCategory
from app.models.quotation import Quotation
from app.repositories.discount_tier_repository import DiscountTierRepository
from app.repositories.quotation_repository import QuotationRepository
from app.schemas.approval_request import BRSCalculationResponse, BRSLineBreakdown

logger = structlog.get_logger(__name__)

# Configurable Category Weights for Discount Overages
CATEGORY_WEIGHTS: Dict[ProductCategory, float] = {
    ProductCategory.HARDWARE: 1.0,
    ProductCategory.SERVICE: 1.5,
    ProductCategory.SUBSCRIPTION: 1.2,
}

# Overall Tier Discount Ceilings
TIER_OVERALL_CAPS: Dict[str, float] = {
    "bronze": 5.0,
    "silver": 10.0,
    "gold": 15.0,
    "enterprise": 20.0,
}


class RiskScoreService:
    """
    Service responsible for deterministic Blended Discount Risk Score (BRS) calculations and overage evaluations.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.quote_repo = QuotationRepository(session)
        self.discount_repo = DiscountTierRepository(session)

    async def calculate_blended_score(
        self,
        quotation_id: uuid.UUID,
        customer_tier: Optional[str] = None,
    ) -> BRSCalculationResponse:
        """
        Calculate the Blended Risk Score (BRS) for a quotation:
        1. Fetch all lines with product category.
        2. Compare line discount against allowed DiscountTier ceiling for (tier, category).
        3. Compute weighted excess: excess = max(0, given - allowed) * category_weight.
        4. Check total order discount % against overall tier cap and apply penalty if exceeded.
        5. Map to Risk Level (Low: 0-5, Medium: 5-15, High: >15).
        6. Persist blended_risk_score on quotation record.
        """
        quote = await self.quote_repo.get_by_id(quotation_id)
        if not quote:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quotation with ID '{quotation_id}' was not found.",
            )

        if not quote.lines:
            # Quote with no lines has 0 risk
            quote.blended_risk_score = 0.0
            await self.quote_repo.save(quote)
            if self.session:
                await self.session.commit()

            return BRSCalculationResponse(
                quotation_id=quote.id,
                customer_tier=customer_tier or "gold",
                gross_total=0.0,
                discount_total=0.0,
                overall_discount_percent=0.0,
                overall_tier_cap=15.0,
                tier_cap_penalty=0.0,
                blended_risk_score=0.0,
                risk_level="Low",
                lines_breakdown=[],
                explanation="No line items on quotation. Risk score is 0.0 (Low).",
            )

        clean_tier = (customer_tier or "gold").strip().lower()
        tier_cap = TIER_OVERALL_CAPS.get(clean_tier, 15.0)

        lines_breakdown = []
        raw_score = 0.0
        gross_total = 0.0
        discount_total = 0.0
        overage_explanations = []

        for line in quote.lines:
            category = line.product.category if line.product else ProductCategory.HARDWARE
            product_name = line.product.name if line.product else "Unknown Product"
            weight = CATEGORY_WEIGHTS.get(category, 1.0)

            # Get allowed max discount ceiling for (tier, category)
            discount_tier = await self.discount_repo.get_by_tier_and_category(
                clean_tier, category
            )
            if not discount_tier:
                # Fallback to bronze or 0%
                discount_tier = await self.discount_repo.get_by_tier_and_category(
                    "bronze", category
                )
            allowed_max = discount_tier.max_discount_percent if discount_tier else 0.0

            discount_given = line.discount_percent
            excess = max(0.0, discount_given - allowed_max)
            line_score = round(excess * weight, 2)
            raw_score += line_score

            gross = line.unit_price * line.quantity
            gross_total += gross
            discount_total += (gross - line.line_total)

            if excess > 0:
                overage_explanations.append(
                    f"{category.value.title()} '{product_name}': discount {discount_given:.1f}% "
                    f"exceeds allowed {allowed_max:.1f}% (+{excess:.1f}% overage @ {weight}x weight)"
                )

            lines_breakdown.append(
                BRSLineBreakdown(
                    line_id=line.id,
                    product_name=product_name,
                    category=category.value,
                    discount_given=discount_given,
                    allowed_discount=allowed_max,
                    excess=round(excess, 2),
                    weight=weight,
                    line_score=line_score,
                )
            )

        # Evaluate overall order discount % against overall tier cap
        overall_discount_percent = (
            round((discount_total / gross_total) * 100.0, 2)
            if gross_total > 0
            else 0.0
        )
        tier_cap_penalty = 0.0
        if overall_discount_percent > tier_cap:
            cap_excess = overall_discount_percent - tier_cap
            tier_cap_penalty = round(cap_excess * 1.5, 2)
            overage_explanations.append(
                f"Overall quote discount of {overall_discount_percent:.1f}% exceeds {clean_tier.title()} "
                f"order cap of {tier_cap:.1f}% (+{tier_cap_penalty} penalty score)"
            )

        blended_score = round(raw_score + tier_cap_penalty, 2)

        # Determine Risk Level: Low (0-5), Medium (5-15), High (>15)
        if blended_score <= 5.0:
            risk_level = "Low"
        elif blended_score <= 15.0:
            risk_level = "Medium"
        else:
            risk_level = "High"

        # Update quotation blended_risk_score
        quote.blended_risk_score = blended_score
        await self.quote_repo.save(quote)
        if self.session:
            await self.session.commit()


        if overage_explanations:
            explanation = (
                f"Blended Risk Score: {blended_score:.2f} ({risk_level} Risk). "
                + "; ".join(overage_explanations)
                + "."
            )
        else:
            explanation = (
                f"Blended Risk Score: {blended_score:.2f} (Low Risk). "
                f"All discounts are within authorized {clean_tier.title()} tier limits."
            )

        logger.info(
            "brs_calculated",
            quotation_id=str(quotation_id),
            blended_score=blended_score,
            risk_level=risk_level,
            customer_tier=clean_tier,
        )

        return BRSCalculationResponse(
            quotation_id=quote.id,
            customer_tier=clean_tier,
            gross_total=round(gross_total, 2),
            discount_total=round(discount_total, 2),
            overall_discount_percent=overall_discount_percent,
            overall_tier_cap=tier_cap,
            tier_cap_penalty=tier_cap_penalty,
            blended_risk_score=blended_score,
            risk_level=risk_level,
            lines_breakdown=lines_breakdown,
            explanation=explanation,
        )


async def calculate_blended_score(
    quotation_id: uuid.UUID,
    session: AsyncSession,
    customer_tier: Optional[str] = None,
) -> BRSCalculationResponse:
    """Helper functional interface for BRS calculation."""
    service = RiskScoreService(session)
    return await service.calculate_blended_score(quotation_id, customer_tier=customer_tier)
