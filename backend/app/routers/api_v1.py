from fastapi import APIRouter
from app.routers.products import router as products_router
from app.routers.price_lists import router as price_lists_router
from app.routers.pricing import router as pricing_router
from app.routers.discount_tiers import router as discount_tiers_router
from app.routers.approval_chains import router as approval_chains_router

api_v1_router = APIRouter()

api_v1_router.include_router(products_router)
api_v1_router.include_router(price_lists_router)
api_v1_router.include_router(pricing_router)
api_v1_router.include_router(discount_tiers_router)
api_v1_router.include_router(approval_chains_router)
