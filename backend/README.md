# DealFlow360 — Intelligent Sales Operations Platform Backend

DealFlow360 is an intelligent, self-governing B2B sales operations platform. This directory contains the complete asynchronous FastAPI backend service built with Async SQLAlchemy 2.0, PostgreSQL, Redis, Celery, Alembic, and deterministic governance patterns.

---

## 🏛️ System Architecture & Domain Flow

DealFlow360 enforces a deterministic sales operations lifecycle:

```
QUOTE → RISK (BRS) → RECOMMENDATION (UPSELL) → APPROVAL → FULFILLMENT → NEGOTIATION → RE-APPROVAL → ORDER → HYBRID BILLING → DEAL HEALTH → CASH
```

```
backend/
├── app/
│   ├── main.py              # FastAPI application, lifespan context, middlewares & RFC 7807 handlers
│   ├── core/
│   │   ├── config.py        # Pydantic Settings loaded from .env
│   │   ├── database.py      # Async SQLAlchemy engine, sessionmaker & get_db dependency
│   │   ├── events.py        # Asynchronous in-memory publish-subscribe event bus
│   │   └── security.py      # JWT authentication tokens & bcrypt password hashing
│   ├── models/              # SQLAlchemy ORM models
│   │   ├── product.py       # Products and Variants
│   │   ├── price_list.py    # Multi-tier pricing lists
│   │   ├── discount_tier.py # Maximum discount tier rules (Bronze, Silver, Gold)
│   │   ├── approval_chain.py# Sequential approval chains & BRS trigger conditions
│   │   ├── quotation.py     # Quotations and QuotationLines
│   │   ├── approval_request.py # Sequential approval requests & decisions
│   │   ├── warehouse.py     # Warehouses, Inventory, and FulfillmentSplits
│   │   ├── subscription.py  # SubscriptionPlans, Subscriptions, Invoices, BillingSchedules, CreditNotes
│   │   ├── product_pairing.py # Upsell/Cross-sell co-purchase pairings
│   │   ├── user.py          # RBAC User accounts & Customer portal mappings
│   │   ├── order.py         # Orders & OrderLines
│   │   ├── alert.py         # Deal health stall alerts & discount anomalies
│   │   └── audit_log.py     # Immutable append-only audit trail
│   ├── repositories/        # Async data access repositories
│   ├── schemas/             # Pydantic request/response validation schemas & DTOs
│   ├── services/            # Pure business logic and domain execution layer
│   │   ├── product_service.py
│   │   ├── pricing_service.py
│   │   ├── discount_config_service.py
│   │   ├── approval_config_service.py
│   │   ├── quotation_service.py
│   │   ├── risk_score.py              # Blended Discount Risk Score (BRS)
│   │   ├── approval_engine.py         # Multi-step sequential approval routing
│   │   ├── warehouse_splitter.py      # Cost-optimal greedy multi-warehouse stock splitter
│   │   ├── fulfillment_override_service.py
│   │   ├── proration_service.py       # Exact daily proportional proration
│   │   ├── subscription_service.py    # Recurring contracts, seat expansion & cancellation
│   │   ├── billing_service.py         # Hybrid capital + recurring billing generator
│   │   ├── upsell_service.py          # Intelligent cross-sell & margin qualification
│   │   ├── auth_service.py            # JWT authentication & customer scoping
│   │   ├── customer_portal_service.py # Customer negotiation & counter-offer re-scoring
│   │   ├── order_service.py           # Order orchestration connecting fulfillment & billing
│   │   ├── deal_health_service.py     # Stall detection & discount anomaly statistics
│   │   ├── reporting_service.py       # Multidimensional reporting & CSV export
│   │   └── audit_service.py           # System-wide audit event recording
│   ├── routers/             # FastAPI HTTP route handlers & endpoints
│   ├── tasks/               # Celery background workers & periodic tasks
│   │   ├── celery_app.py    # Celery configuration & beat schedule
│   │   ├── health_checks.py # Periodic stall & anomaly detection tasks
│   │   └── fulfillment_tasks.py # Async inventory allocation worker
│   └── utils/
│       ├── idempotency.py   # Transactional idempotency store and key locking
│       └── logging.py       # Structlog structured JSON logging & correlation ID tracing
├── tests/
│   ├── conftest.py          # Pytest fixtures and async HTTP client configuration
│   ├── unit/                # Unit test suites (pricing, risk, proration, upsell, health)
│   └── integration/         # Integration test suites (negotiation, full lifecycle)
├── alembic/                 # 10 sequential database schema migrations
├── docker-compose.yml       # Multi-service stack (PostgreSQL 15, Redis 7, FastAPI App)
├── Dockerfile               # Production multi-stage Docker build
├── requirements.txt         # Pinned production dependencies
└── README.md
```

---

## 🚀 Quickstart Guide

### Option 1: Running with Docker Compose (Recommended)

Start the entire stack (PostgreSQL, Redis, and FastAPI backend) with one command:

```bash
# 1. Create your local .env from template
cp .env.example .env

# 2. Spin up containers
docker-compose up -d

# 3. Run database migrations
docker-compose exec app alembic upgrade head

# 4. View application logs
docker-compose logs -f app
```

Once running:
- **API Health Check**: [http://localhost:8000/health](http://localhost:8000/health)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Specifications**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

### Option 2: Running Locally with Python Virtual Environment

#### 1. Prerequisites
- Python 3.11+
- PostgreSQL 15+ running locally
- Redis 7+ running locally

#### 2. Environment Setup

```bash
cd backend
python -m venv .venv

# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
```

#### 3. Run Database Migrations

```bash
alembic upgrade head
```

#### 4. Run Development Server

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 5. Run Celery Background Worker & Periodic Beat Scheduler

In separate terminal windows:

```bash
# Run Celery Worker for async fulfillment tasks
celery -A app.tasks.celery_app worker --loglevel=info

# Run Celery Beat for periodic health checks (stalled deals & discount anomalies)
celery -A app.tasks.celery_app beat --loglevel=info
```

---

## 🧪 Running Automated Tests

Run the full automated test suite:

```bash
# Run all unit and integration tests
pytest -v

# Run the complete End-to-End Lifecycle Integration Test
pytest tests/integration/test_full_flow.py -v

# Run with test coverage report
pytest --cov=app tests/
```

---

## 🛡️ Core Business Rules & Intelligence Principles

1. **RULES = TRUTH, AI = INTELLIGENCE**:
   - Deterministic backend logic governs discount limits, risk scores, warehouse splits, proration, and billing.
   - AI provides natural explanations and recommendations without overriding business limits.
2. **EXPLAIN EVERY IMPORTANT DECISION**:
   - Every block, approval routing, risk score, and upsell recommendation explicitly explains **WHAT** happened, **WHY** it happened, and **WHAT** happens next.
3. **BACKEND IS THE SOURCE OF TRUTH**:
   - All margin calculations, discount ceilings, and state transitions are strictly validated and executed on the backend.
