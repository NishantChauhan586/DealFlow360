import json
import uuid
import sys
import os
from datetime import datetime, timezone, timedelta
import random

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.core.security import get_password_hash
from app.models.product import ProductCategory
from app.models.subscription import SubscriptionInterval
from app.models.alert import AlertType, AlertSeverity

def dt_iso(days_offset=0):
    return (datetime.now(timezone.utc) + timedelta(days=days_offset)).isoformat()

# --- Realistic Data Generators ---
FIRST_NAMES = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen", "Elena", "Marcus", "Priya", "Chen", "Sofia", "Omar", "Isabella", "Lucas"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris"]
COMPANIES_PRE = ["Apex", "Vertex", "Quantum", "Nexus", "Stratos", "Omni", "Zephyr", "Cobalt", "Titan", "Nova", "Aero", "Pulse", "Cyber", "Data", "Cloud", "Net", "Tech", "Global", "Alpha", "Omega"]
COMPANIES_POST = ["Solutions", "Systems", "Networks", "Technologies", "Corp", "Inc", "LLC", "Group", "Dynamics", "Logistics", "Services", "Industries", "Enterprises", "Partners", "Innovations"]
CITIES = ["San Francisco, CA", "New York, NY", "London, UK", "Berlin, DE", "Tokyo, JP", "Austin, TX", "Seattle, WA", "Toronto, ON", "Sydney, AU", "Singapore, SG", "Paris, FR", "Dublin, IE"]

HW_PRODUCTS = ["Siemens Magnetom MRI Scanner", "GE Revolution CT Scanner", "Philips EPIQ 7 Ultrasound", "Medtronic 980 Ventilator", "Stryker System 8 Power Tool", "Caterpillar 320 Excavator", "Komatsu D61EX-24 Dozer", "Volvo L90H Wheel Loader", "John Deere 310L Backhoe", "Bobcat T76 Track Loader", "Ford Transit Cargo Van", "Tesla Model 3 Fleet", "Toyota Tacoma Work Truck", "Peterbilt 579 Semi Tractor", "Freightliner Cascadia"]
SUB_PRODUCTS = ["Epic EHR Enterprise License", "Cerner Millennium EHR", "PaxeraHealth PACS Cloud", "DrChrono Practice Management", "Procore Construction Management", "Autodesk Build (BIM 360)", "Bluebeam Revu Enterprise", "PlanGrid Submittal License", "Samsara Fleet Tracking Pro", "Geotab Telematics Subscription", "Fleetio Fleet Management Software", "KeepTruckin ELD Compliance"]
SVC_PRODUCTS = ["Hospital Workflow Optimization Consulting", "Medical Device Compliance Audit", "EHR System Implementation", "Clinical Staff Training (On-site)", "Site Safety Inspection Service", "Structural Engineering Consultation", "Heavy Equipment Maintenance Contract", "Project Management Support", "Fleet Logistics Optimization Strategy", "Commercial Vehicle Preventative Maintenance", "Automotive Supply Chain Audit", "Driver Safety Training Workshop"]

PROJECT_TITLES = ["Q3 Infrastructure Upgrade", "Global Rollout Phase 1", "HQ Network Refresh", "Cloud Migration Initiative", "Enterprise Licensing Agreement", "Annual Renewal", "Branch Office Expansion", "Security Remediation Project", "Digital Transformation - Core", "Data Center Consolidation"]
ANOMALY_NOTES = ["Requested 45% discount on highly constrained hardware", "Deal velocity is 3x faster than average", "Competitor 'TechCorp' mentioned, aggressive pricing matched", "End of quarter rush, skipped standard technical review", "Customer tier does not match volume requested", "Unusual shipping destination for this account"]
STALLED_REASONS = ["Waiting on CFO approval", "Legal reviewing terms", "Budget frozen until next FY", "Champion left the company", "Evaluating competitor POC", "Technical blocker on security compliance"]

def gen_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"

def gen_company():
    return f"{random.choice(COMPANIES_PRE)} {random.choice(COMPANIES_POST)}"

def generate_data():
    data = {
        "users": [],
        "warehouses": [],
        "products": [],
        "discount_tiers": [],
        "approval_chains": [],
        "inventory": [],
        "price_lists": [],
        "subscription_plans": [],
        "product_pairings": [],
        "quotes": [],
        "quote_items": [],
        "approval_audits": [],
        "subscription_contracts": [],
        "orders": [],
        "fulfillment_records": [],
        "deal_anomalies": [],
        "stalled_deals": [],
        "alerts": []
    }

    random.seed(42)

    # 1. Users (250)
    roles = ["admin", "vp_sales", "sales_manager", "finance"] + ["sales_rep"] * 123 + ["customer"] * 123
    user_ids = []
    customer_ids = []
    sales_reps = []

    for i, role in enumerate(roles):
        uid = str(uuid.uuid4())
        user_ids.append(uid)
        if role == "sales_rep":
            sales_reps.append(uid)
        elif role == "customer":
            customer_ids.append(uid)
            
        full_name = gen_name()

        data["users"].append({
            "id": uid,
            "email": f"{full_name.replace(' ', '.').lower()}_{i}@example.com",
            "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjIQqiRQYq", # Hardcoded for speed
            "full_name": full_name,
            "role": role,
            "is_active": True,
            "is_superuser": role == "admin",
            "created_at": dt_iso(-random.randint(100, 500)),
            "updated_at": dt_iso(-random.randint(1, 30))
        })

    # 2. Warehouses (10)
    wh_ids = []
    for i in range(10):
        wid = str(uuid.uuid4())
        wh_ids.append(wid)
        data["warehouses"].append({
            "id": wid,
            "name": f"Fulfillment Center {random.choice(CITIES).split(',')[0]}",
            "address": f"{random.randint(100, 9999)} Industrial Pkwy, {random.choice(CITIES)}",
            "shipping_cost_weight": round(random.uniform(0.8, 1.5), 2),
            "is_active": True,
            "created_at": dt_iso(-400),
            "updated_at": dt_iso(-10)
        })

    # 3. Products (300)
    prod_ids = []
    hw_ids = []
    sub_ids = []
    for i in range(300):
        pid = str(uuid.uuid4())
        prod_ids.append(pid)
        cat = random.choice([ProductCategory.HARDWARE, ProductCategory.SERVICE, ProductCategory.SUBSCRIPTION])
        
        if cat == ProductCategory.HARDWARE:
            hw_ids.append(pid)
            name = f"{random.choice(HW_PRODUCTS)} Gen{random.randint(1,5)}"
            desc = "High-performance enterprise hardware appliance."
        elif cat == ProductCategory.SUBSCRIPTION:
            sub_ids.append(pid)
            name = f"{random.choice(SUB_PRODUCTS)} {random.choice(['Basic', 'Pro', 'Enterprise', 'Ultimate'])}"
            desc = "Scalable cloud subscription software."
        else:
            name = f"{random.choice(SVC_PRODUCTS)} ({random.choice(['Remote', 'On-site'])})"
            desc = "Professional services and consulting."
            
        data["products"].append({
            "id": pid,
            "name": name,
            "category": cat.value,
            "description": desc,
            "unit": "unit" if cat == ProductCategory.HARDWARE else "license" if cat == ProductCategory.SUBSCRIPTION else "hour",
            "tax_rate": random.choice([0.0, 0.05, 0.1, 0.2]),
            "created_at": dt_iso(-random.randint(200, 400)),
            "updated_at": dt_iso(-random.randint(5, 50))
        })

    # 4. Inventory (1000) -> 10 WH * 100 HW
    for wid in wh_ids:
        for pid in random.sample(hw_ids, min(100, len(hw_ids))):
            data["inventory"].append({
                "id": str(uuid.uuid4()),
                "warehouse_id": wid,
                "product_id": pid,
                "quantity_on_hand": random.randint(0, 1000),
                "reserved_quantity": random.randint(0, 50),
                "reorder_point": random.choice([10, 20, 50, 100]),
                "created_at": dt_iso(-100),
                "updated_at": dt_iso(-random.randint(1, 10))
            })

    # 5. PriceList (750) -> 3 tiers * 250 products
    for pid in prod_ids:
        base_p = round(random.uniform(50.0, 15000.0), 2)
        for tier, mult in [("bronze", 1.0), ("silver", 0.9), ("gold", 0.75)]:
            data["price_lists"].append({
                "id": str(uuid.uuid4()),
                "name": f"{tier.title()} USD",
                "product_id": pid,
                "customer_tier": tier,
                "currency": "USD",
                "base_price": round(base_p * mult, 2),
                "effective_from": dt_iso(-300),
                "created_at": dt_iso(-300),
                "updated_at": dt_iso(-300)
            })

    # 6. DiscountTiers (9)
    for cat in [ProductCategory.HARDWARE, ProductCategory.SERVICE, ProductCategory.SUBSCRIPTION]:
        for tier, disc in [("bronze", 5.0), ("silver", 15.0), ("gold", 30.0)]:
            data["discount_tiers"].append({
                "id": str(uuid.uuid4()),
                "name": f"{tier.title()} {cat.value} Ceiling",
                "customer_tier": tier,
                "category": cat.value,
                "max_discount_percent": disc,
                "created_at": dt_iso(-400),
                "updated_at": dt_iso(-400)
            })

    # 7. ApprovalChains (5)
    for i in range(5):
        data["approval_chains"].append({
            "id": str(uuid.uuid4()),
            "name": f"Risk Tier {i+1} Chain",
            "trigger_condition": {"min_risk": i*20, "max_risk": (i+1)*20},
            "sequence": ["sales_manager"] if i < 2 else ["sales_manager", "finance"] if i < 4 else ["sales_manager", "finance", "vp_sales"],
            "is_active": True,
            "created_at": dt_iso(-400),
            "updated_at": dt_iso(-400)
        })

    # 8. SubscriptionPlans (50)
    for pid in sub_ids[:50]:
        data["subscription_plans"].append({
            "id": str(uuid.uuid4()),
            "product_id": pid,
            "interval": random.choice([SubscriptionInterval.MONTHLY.value, SubscriptionInterval.YEARLY.value]),
            "interval_count": 1,
            "trial_period_days": random.choice([0, 14, 30]),
            "created_at": dt_iso(-200),
            "updated_at": dt_iso(-200)
        })

    # 9. ProductPairings (250)
    seen_pairs = set()
    while len(data["product_pairings"]) < 250:
        src = random.choice(prod_ids)
        tgt = random.choice(prod_ids)
        if src == tgt or (src, tgt) in seen_pairs:
            continue
        seen_pairs.add((src, tgt))
        data["product_pairings"].append({
            "id": str(uuid.uuid4()),
            "source_product_id": src,
            "target_product_id": tgt,
            "co_purchase_score": round(random.uniform(0.6, 0.99), 2),
            "is_promoted": random.choice([True, False]),
            "min_margin_threshold": 0.25,
            "created_at": dt_iso(-100),
            "updated_at": dt_iso(-100)
        })

    # 10. Quotes (250) and QuoteItems (750)
    quote_ids = []
    for i in range(250):
        qid = f"Q-{1000+i}"
        quote_ids.append(qid)
        status = random.choice(["draft", "pending_approval", "approved", "won", "lost", "expired"])
        
        company = gen_company()
        is_enterprise = random.random() > 0.8
        
        # Enterprise deals are much larger
        base_multiplier = random.uniform(10, 100) if is_enterprise else random.uniform(1, 10)
        subtotal = round(base_multiplier * 5000, 2)
        disc_pct = round(random.uniform(0.0, 35.0), 2)
        disc_amt = round(subtotal * (disc_pct / 100.0), 2)
        tax = round((subtotal - disc_amt) * 0.1, 2)
        
        data["quotes"].append({
            "id": qid,
            "customer_name": gen_name(),
            "customer_email": f"procurement@{company.replace(' ', '').lower()}.com",
            "company_name": company,
            "title": f"{company} - {random.choice(PROJECT_TITLES)}",
            "description": "Enterprise quote and proposal tailored for scale." if is_enterprise else "Standard volume quote.",
            "currency": random.choice(["USD", "EUR", "GBP"]),
            "valid_until": dt_iso(random.randint(-10, 60)),
            "status": status,
            "sales_rep": random.choice(sales_reps) if sales_reps else str(uuid.uuid4()),
            "subtotal": subtotal,
            "discount_percent": disc_pct,
            "discount_amount": disc_amt,
            "tax": tax,
            "grand_total": round(subtotal - disc_amt + tax, 2),
            "blended_margin_percent": round(random.uniform(20.0, 75.0), 2),
            "risk_score": round(random.uniform(5.0, 95.0), 1),
            "risk_level": random.choice(["Low", "Medium", "High", "Critical"]),
            "required_approval_tier": random.choice(["None", "Manager", "Finance", "VP"]),
            "submitted_at": dt_iso(-random.randint(5, 30)) if status != "draft" else None,
            "created_at": dt_iso(-random.randint(31, 90)),
            "updated_at": dt_iso(-random.randint(1, 10))
        })
        
        for j in range(random.randint(1, 5)):
            qty = random.randint(10, 500) if is_enterprise else random.randint(1, 25)
            uprice = round(random.uniform(100, 5000), 2)
            ucost = round(uprice * random.uniform(0.3, 0.7), 2)
            
            data["quote_items"].append({
                "quote_id": qid,
                "id": str(uuid.uuid4()),
                "product_id": random.choice(prod_ids),
                "name": f"Line Item {j+1}",
                "category": random.choice([c.value for c in ProductCategory]),
                "quantity": qty,
                "unit_price": uprice,
                "unit_cost": ucost,
                "discount_percent": round(random.uniform(0, 30), 2),
                "line_total": round(qty * uprice * 0.9, 2),
                "ceiling_percent": 15.0,
                "ceiling_breached": random.choice([True, False]),
                "overage_percent": round(random.uniform(0, 10), 1),
                "created_at": dt_iso(-40),
                "updated_at": dt_iso(-10)
            })

    # 11. ApprovalAudits (150)
    for i, qid in enumerate(quote_ids[:150], 1):
        data["approval_audits"].append({
            "quote_id": qid,
            "id": i,
            "approver_name": gen_name(),
            "approver_role": random.choice(["sales_manager", "finance", "vp_sales"]),
            "action": random.choice(["approved", "approved", "rejected", "requested_changes"]),
            "breached_rule": "Discount > 20% on Hardware" if random.random() > 0.5 else "Total Margin < 35%",
            "overage_percent": round(random.uniform(1.0, 15.0), 1),
            "rationale": "Strategic account, matching competitor pricing." if random.random() > 0.5 else "Volume commitment makes up for margin loss.",
            "created_at": dt_iso(-random.randint(5, 20)),
            "updated_at": dt_iso(-random.randint(1, 4))
        })

    # 12. SubscriptionContracts (250)
    for i, qid in enumerate(quote_ids[:250], 1):
        comp = gen_company()
        mrr = round(random.uniform(500, 25000), 2)
        data["subscription_contracts"].append({
            "id": i,
            "quote_id": qid,
            "customer_name": gen_name(),
            "customer_email": f"billing@{comp.replace(' ', '').lower()}.com",
            "billing_frequency": random.choice(["Monthly", "Annual", "Quarterly"]),
            "mrr_amount": mrr,
            "arr_amount": mrr * 12,
            "one_time_charges": round(random.uniform(0, 10000), 2),
            "status": random.choice(["Active", "Active", "Active", "Suspended", "Churned"]),
            "start_date": dt_iso(-random.randint(30, 300)),
            "renewal_date": dt_iso(random.randint(30, 360)),
            "created_at": dt_iso(-300),
            "updated_at": dt_iso(-10)
        })

    # 13. Orders & FulfillmentRecords (250)
    for i, qid in enumerate(quote_ids[:250]):
        oid = str(uuid.uuid4())
        data["orders"].append({
            "id": oid,
            "order_number": f"ORD-2026-{1000+i}",
            "quotation_id": None,
            "customer_id": random.choice(customer_ids) if customer_ids else str(uuid.uuid4()),
            "total_amount": round(random.uniform(1000, 500000), 2),
            "currency": random.choice(["USD", "EUR", "GBP"]),
            "status": random.choice(["processing", "shipped", "delivered", "on_hold"]),
            "created_at": dt_iso(-random.randint(5, 60)),
            "updated_at": dt_iso(-random.randint(1, 4))
        })
        
        qty = random.randint(5, 250)
        data["fulfillment_records"].append({
            "id": i + 1,
            "quote_id": qid,
            "warehouse_code": f"WH-{random.choice(['US-EAST', 'US-WEST', 'EU-CEN', 'AP-SOUTH'])}",
            "allocated_quantity": qty,
            "shipped_quantity": qty if random.random() > 0.3 else 0,
            "backorder_quantity": 0 if random.random() > 0.3 else random.randint(1, 50),
            "status": random.choice(["Allocated", "Shipped", "Delivered", "Backordered"]),
            "tracking_number": f"TRK{random.randint(10000000, 99999999)}" if random.random() > 0.3 else None,
            "created_at": dt_iso(-random.randint(5, 30)),
            "updated_at": dt_iso(-random.randint(1, 4))
        })

    # 14. Anomalies & Stalled (100)
    for i in range(50):
        data["deal_anomalies"].append({
            "id": i + 1,
            "customer_name": gen_company(),
            "note": random.choice(ANOMALY_NOTES),
            "level": random.choice(["Low", "Medium", "High"]),
            "is_resolved": random.choice([True, False]),
            "created_at": dt_iso(-random.randint(1, 20)),
            "updated_at": dt_iso(-random.randint(1, 5))
        })
        data["stalled_deals"].append({
            "id": i + 1,
            "customer_name": gen_company(),
            "amount": f"${random.randint(10, 500)},000",
            "days_stalled": random.randint(15, 120),
            "sales_rep": random.choice(sales_reps) if sales_reps else str(uuid.uuid4()),
            "created_at": dt_iso(-random.randint(20, 100)),
            "updated_at": dt_iso(-random.randint(1, 10))
        })

    # 15. Alerts (250)
    for i in range(250):
        data["alerts"].append({
            "id": str(uuid.uuid4()),
            "type": random.choice([a.value for a in AlertType]),
            "severity": random.choice([a.value for a in AlertSeverity]),
            "message": random.choice(["Margin threshold breached", "Unusual shipping pattern detected", "Discount velocity extremely high", "Missing approval workflow", "Compliance risk flagged"]),
            "details": {"system_confidence": round(random.uniform(0.6, 0.99), 2)},
            "created_at": dt_iso(-random.randint(0, 15)),
            "updated_at": dt_iso(0)
        })

    return data

if __name__ == "__main__":
    out_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "seed", "database-seed.json")
    print(f"Generating seed data to {out_file} ...")
    data = generate_data()
    
    total = sum(len(v) for v in data.values())
    print(f"Generated {total} records across {len(data)} entities.")
    
    with open(out_file, "w") as f:
        json.dump(data, f, indent=2)
    print("Done!")

