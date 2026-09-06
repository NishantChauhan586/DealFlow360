import asyncio
import sys
import os
import json
import traceback
from datetime import datetime
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# pyrefly: ignore [missing-import]
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select, DateTime
from sqlalchemy.inspection import inspect

from app.core.database import AsyncSessionLocal, engine
from app.models.base import Base
from app.models.user import User
from app.models.product import Product
from app.models.warehouse import Warehouse, Inventory
from app.models.price_list import PriceList
from app.models.discount_tier import DiscountTier
from app.models.approval_chain import ApprovalChain
from app.models.product_pairing import ProductPairing
from app.models.subscription import SubscriptionPlan, SubscriptionContract
from app.models.quote import Quote, QuoteItem, ApprovalAudit
from app.models.order import Order
from app.models.fulfillment import FulfillmentRecord
from app.models.anomaly import DealAnomaly, StalledDeal
from app.models.alert import Alert

# The exact order in which to import to satisfy foreign keys
IMPORT_ORDER = [
    ("users", User),
    ("products", Product),
    ("warehouses", Warehouse),
    ("discount_tiers", DiscountTier),
    ("approval_chains", ApprovalChain),
    ("inventory", Inventory),
    ("price_lists", PriceList),
    ("subscription_plans", SubscriptionPlan),
    ("product_pairings", ProductPairing),
    ("quotes", Quote),
    ("quote_items", QuoteItem),
    ("approval_audits", ApprovalAudit),
    ("subscription_contracts", SubscriptionContract),
    ("orders", Order),
    ("fulfillment_records", FulfillmentRecord),
    ("deal_anomalies", DealAnomaly),
    ("stalled_deals", StalledDeal),
    ("alerts", Alert)
]

async def run_import():
    seed_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "seed", "database-seed.json")
    
    if not os.path.exists(seed_file):
        print(f"[ERROR] Seed file not found at: {seed_file}")
        sys.exit(1)
        
    print(f"Loading seed data from {seed_file}...")
    with open(seed_file, "r") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            print(f"[ERROR] Invalid JSON format: {e}")
            sys.exit(1)

    print("Initializing Database Tables (if not exist)...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("Starting Idempotent Import Transaction (Deterministic Reset)...")
    async with AsyncSessionLocal() as session:
        try:
            total_imported = 0
            print("Clearing existing seeded tables...")
            # Import remaining models so Base.metadata knows about them
            from app.models.subscription import Subscription, Invoice, BillingSchedule, CreditNote
            from app.models.quotation import Quotation, QuotationLine
            from app.models.approval_request import ApprovalRequest
            from app.models.audit_log import AuditLog
            from app.models.order import OrderLine
            
            # Safely delete from all tables in reverse foreign key order
            for table in reversed(Base.metadata.sorted_tables):
                await session.execute(table.delete())
            await session.flush()
            
            for dict_key, model_class in IMPORT_ORDER:
                records = data.get(dict_key, [])
                if not records:
                    continue
                    
                print(f"Importing {len(records)} records into {model_class.__tablename__}...")
                
                mapper = inspect(model_class)
                for record_data in records:
                    try:
                        # Convert ISO date strings to datetime objects only if column is DateTime
                        for k, v in record_data.items():
                            if isinstance(v, str):
                                col = mapper.columns.get(k)
                                if col is not None and isinstance(col.type, DateTime):
                                    try:
                                        record_data[k] = datetime.fromisoformat(v)
                                    except Exception:
                                        pass
                                        
                        # Instantiate the SQLAlchemy model
                        instance = model_class(**record_data)
                        # Merge performs an UPSERT based on primary key
                        await session.merge(instance)
                        total_imported += 1
                    except Exception as record_error:
                        print(f"\n[ERROR] Failed to prepare record for {dict_key}")
                        print(f"Record Data: {record_data}")
                        print(f"Exception: {str(record_error)}")
                        raise record_error
                
                # Flush after each entity type to ensure relationships can be resolved
                await session.flush()
                
            # If we get here, everything was merged successfully
            await session.commit()
            print(f"\n[SUCCESS] Seed import completed safely! {total_imported} records processed.")

        except IntegrityError as e:
            await session.rollback()
            print(f"\n[INTEGRITY ERROR] Transaction Rolled Back.")
            print(f"Constraint Violation: {e.orig}")
            sys.exit(1)
            
        except Exception as e:
            await session.rollback()
            print(f"\n[UNEXPECTED ERROR] Transaction Rolled Back.")
            traceback.print_exc()
            sys.exit(1)

if __name__ == "__main__":
    if os.environ.get("ENVIRONMENT") == "production":
        print("[WARNING] ENVIRONMENT is set to production. Seed script aborted for safety.")
        sys.exit(1)
        
    asyncio.run(run_import())
