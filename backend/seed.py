import asyncio
import sys
import os

# Ensure backend folder is in sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import AsyncSessionLocal, engine
from app.models.base import Base
from app.models.user import User
from app.models.product import Product, ProductCategory
from app.models.fulfillment import Warehouse
from app.models.anomaly import DealAnomaly, StalledDeal
from app.models.quote import Quote, QuoteItem, ApprovalAudit
from app.models.subscription import SubscriptionContract
from app.core.security import get_password_hash
from app.services.quote_service import create_quote, submit_quote_for_approval
from app.schemas.quote import QuoteCreate, QuoteItemCreate


async def seed_database():
    """
    Populates local database with default products, warehouses, users, quotes, and AI deal health data.
    """
    print("[1/5] Initializing local database schema...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # 1. Seed Users
        stmt_users = select(User)
        res_users = await session.execute(stmt_users)
        if not res_users.scalars().all():
            print("[2/5] Seeding default users...")
            users = [
                User(
                    email="admin@dealflow360.com",
                    hashed_password=get_password_hash("admin123"),
                    full_name="System Administrator",
                    role="admin",
                    is_superuser=True,
                ),
                User(
                    email="rep@dealflow360.com",
                    hashed_password=get_password_hash("rep123"),
                    full_name="S. Adeyemi",
                    role="sales_rep",
                ),
                User(
                    email="manager@dealflow360.com",
                    hashed_password=get_password_hash("manager123"),
                    full_name="R. Okafor",
                    role="sales_manager",
                ),
                User(
                    email="vp@dealflow360.com",
                    hashed_password=get_password_hash("vp123"),
                    full_name="J. Vance",
                    role="vp_sales",
                ),
                User(
                    email="customer@acme.com",
                    hashed_password=get_password_hash("customer123"),
                    full_name="Acme Procurement",
                    role="customer",
                ),
            ]
            session.add_all(users)
            await session.commit()

        # 2. Seed Warehouses
        stmt_wh = select(Warehouse)
        res_wh = await session.execute(stmt_wh)
        if not res_wh.scalars().all():
            print("[3/5] Seeding global warehouses...")
            warehouses = [
                Warehouse(code="US-East", name="US East Fulfillment Hub", location="New York, USA", available_units=1450, reserved_units=120),
                Warehouse(code="EU-Central", name="EU Central Logistics Centre", location="Frankfurt, Germany", available_units=980, reserved_units=45),
                Warehouse(code="APAC", name="APAC Primary Warehouse", location="Singapore", available_units=620, reserved_units=15),
            ]
            session.add_all(warehouses)
            await session.commit()

        # 3. Seed Catalog Products
        stmt_prod = select(Product)
        res_prod = await session.execute(stmt_prod)
        if not res_prod.scalars().all():
            print("[4/5] Seeding product catalog...")
            products = [
                Product(name="Orion Laptop 14\"", category=ProductCategory.HARDWARE, description="Enterprise laptop 14 inch", unit="unit"),
                Product(name="Onsite Setup Service", category=ProductCategory.SERVICE, description="Professional onsite implementation", unit="hour"),
                Product(name="Extended Care Plan", category=ProductCategory.SERVICE, description="24/7 dedicated support & warranty", unit="year"),
                Product(name="Docking Station", category=ProductCategory.HARDWARE, description="Thunderbolt 4 dual display docking hub", unit="unit"),
                Product(name="Fleet Manager (Sub)", category=ProductCategory.SUBSCRIPTION, description="SaaS fleet license per node", unit="license"),
                Product(name="Security Suite (Sub)", category=ProductCategory.SUBSCRIPTION, description="Endpoint protection license", unit="license"),
            ]
            session.add_all(products)
            await session.commit()

        # 4. Seed Deal Anomalies & Stalled Deals
        stmt_anom = select(DealAnomaly)
        res_anom = await session.execute(stmt_anom)
        if not res_anom.scalars().all():
            print("[5/5] Seeding AI deal health anomalies & stalled deals...")
            anomalies = [
                DealAnomaly(customer_name="Acme Corp", note="18% given on Services, 10% allowed", level="High"),
                DealAnomaly(customer_name="Northwind Retail", note="Blended overage across 4 lines", level="Medium"),
                DealAnomaly(customer_name="Sable & Co", note="Discount 3x rep's 90-day average", level="High"),
            ]
            stalled = [
                StalledDeal(customer_name="Marlowe & Finch", amount="$48,200", days_stalled=9, sales_rep="S. Adeyemi"),
                StalledDeal(customer_name="Halcyon Textiles", amount="$21,900", days_stalled=14, sales_rep="R. Okafor"),
                StalledDeal(customer_name="Bramwell Group", amount="$63,000", days_stalled=6, sales_rep="J. Vance"),
            ]
            session.add_all(anomalies)
            session.add_all(stalled)
            await session.commit()

        # 5. Seed Sample Quotes across Lifecycle
        stmt_quotes = select(Quote)
        res_quotes = await session.execute(stmt_quotes)
        if not res_quotes.scalars().all():
            print("[+] Seeding demo pipeline quotations...")
            
            # Quote 1: Draft
            q1 = await create_quote(
                session,
                QuoteCreate(
                    customer_name="Widget Holdings",
                    customer_email="contact@widgetholdings.com",
                    company_name="Widget Holdings",
                    title="Hardware & Fleet Modernization",
                    discount_percent=0.0,
                    line_items=[
                        QuoteItemCreate(name="Orion Laptop 14\"", category="Hardware", quantity=8, unit_price=1450.0, unit_cost=1015.0, discount_percent=5.0),
                        QuoteItemCreate(name="Docking Station", category="Hardware", quantity=5, unit_price=180.0, unit_cost=110.0, discount_percent=0.0),
                    ]
                )
            )

            # Quote 2: Pending Approval (Breached Ceiling)
            q2 = await create_quote(
                session,
                QuoteCreate(
                    customer_name="Acme Corp",
                    customer_email="procurement@acme.com",
                    company_name="Acme Corp",
                    title="Enterprise Infrastructure Package",
                    discount_percent=0.0,
                    line_items=[
                        QuoteItemCreate(name="Orion Laptop 14\"", category="Hardware", quantity=20, unit_price=1450.0, unit_cost=1015.0, discount_percent=12.0),
                        QuoteItemCreate(name="Onsite Setup Service", category="Services", quantity=10, unit_price=600.0, unit_cost=480.0, discount_percent=18.0),
                    ]
                )
            )
            await submit_quote_for_approval(session, q2.id)

            # Quote 3: Approved
            q3 = await create_quote(
                session,
                QuoteCreate(
                    customer_name="Bramwell Group",
                    customer_email="sales@bramwell.com",
                    company_name="Bramwell Group",
                    title="Global Expansion Hardware",
                    discount_percent=0.0,
                    line_items=[
                        QuoteItemCreate(name="Orion Laptop 14\"", category="Hardware", quantity=40, unit_price=1450.0, unit_cost=1015.0, discount_percent=8.0),
                    ]
                )
            )
            await submit_quote_for_approval(session, q3.id)

            # Quote 4: Subscription Contract
            sub = SubscriptionContract(
                quote_id=q3.id,
                customer_name="Bramwell Group",
                customer_email="sales@bramwell.com",
                billing_frequency="Annual",
                mrr_amount=4800.0,
                arr_amount=57600.0,
                one_time_charges=5400.0,
                status="Active",
                start_date="2026-09-01",
                renewal_date="2027-09-01",
            )
            session.add(sub)
            await session.commit()

    print("[SUCCESS] Database seed completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed_database())
