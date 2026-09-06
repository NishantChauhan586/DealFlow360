from app.routers.api_v1 import api_v1_router
from app.routers.products import router as products_router
from app.routers.price_lists import router as price_lists_router
from app.routers.pricing import router as pricing_router
from app.routers.discount_tiers import router as discount_tiers_router
from app.routers.approval_chains import router as approval_chains_router
from app.routers.quotations import router as quotations_router
from app.routers.warehouses import router as warehouses_router
from app.routers.fulfillment import router as fulfillment_router
from app.routers.orders import router as orders_router
from app.routers.subscriptions import router as subscriptions_router
from app.routers.product_pairings import router as product_pairings_router
from app.routers.auth import router as auth_router
from app.routers.portal import router as portal_router
from app.routers.dashboard import router as dashboard_router
from app.routers.reports import router as reports_router
from app.routers.audit_logs import router as audit_logs_router

__all__ = [
    "api_v1_router",
    "auth_router",
    "portal_router",
    "dashboard_router",
    "reports_router",
    "audit_logs_router",
    "products_router",
    "price_lists_router",
    "pricing_router",
    "discount_tiers_router",
    "approval_chains_router",
    "quotations_router",
    "orders_router",
    "warehouses_router",
    "fulfillment_router",
    "subscriptions_router",
    "product_pairings_router",
]
