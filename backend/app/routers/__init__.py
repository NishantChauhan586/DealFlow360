from app.routers.api_v1 import api_v1_router
from app.routers.products import router as products_router
from app.routers.price_lists import router as price_lists_router
from app.routers.pricing import router as pricing_router
from app.routers.discount_tiers import router as discount_tiers_router
from app.routers.approval_chains import router as approval_chains_router

__all__ = [
    "api_v1_router",
    "products_router",
    "price_lists_router",
    "pricing_router",
    "discount_tiers_router",
    "approval_chains_router",
]
