# DealFlow360 — Backend Infrastructure Skeleton

DealFlow360 is an intelligent, self-governing B2B sales operations platform. This directory contains the FastAPI backend service built with an asynchronous architecture, strict type enforcement, deterministic governance patterns, and structured observability.

---

## 🏛️ Project Architecture

```
backend/
├── app/
│   ├── main.py              # FastAPI application, lifespan context, middlewares & RFC 7807 handlers
│   ├── core/
│   │   ├── config.py        # Pydantic Settings loaded from .env
│   │   ├── database.py      # Async SQLAlchemy engine, sessionmaker & get_db dependency
│   │   ├── events.py        # Asynchronous in-memory publish-subscribe event bus
│   │   └── security.py      # JWT authentication tokens & bcrypt password hashing
│   ├── models/              # SQLAlchemy ORM models (DeclarativeBase & TimestampMixin in base.py)
│   ├── schemas/             # Pydantic request/response validation schemas & DTOs
│   ├── services/            # Pure business logic and domain execution layer
│   ├── routers/             # FastAPI HTTP route handlers & endpoints
│   └── utils/
│       ├── idempotency.py   # Transactional idempotency store and key locking
│       └── logging.py       # Structlog structured JSON logging & correlation ID tracing
├── tests/
│   ├── conftest.py          # Pytest fixtures and async HTTP client configuration
│   ├── unit/                # Unit test suite (security, event bus, etc.)
│   └── integration/         # Integration test suite (health checks, RFC 7807 responses)
├── alembic/                 # Database schema migrations
├── docker-compose.yml       # Multi-service stack (PostgreSQL 15, Redis 7, FastAPI App)
├── Dockerfile               # Production multi-stage Docker build
├── requirements.txt         # Core dependencies with pinned version ranges
├── .env.example             # Configuration environment variable template
└── README.md                # Backend documentation and onboarding guide
```

---

## 🚀 Quickstart Guide

### Option 1: Running with Docker Compose (Recommended)

Start the entire stack (PostgreSQL, Redis, and FastAPI app) in detached mode:

```bash
# 1. Create your local .env from template
cp .env.example .env

# 2. Spin up containers
docker-compose up -d

# 3. View application logs
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
- PostgreSQL 15+ running locally (or via `docker-compose up -d postgres redis`)
- Redis 7+ running locally

#### 2. Environment Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

#### 3. Configuration

```bash
cp .env.example .env
```

Review `.env` and configure your credentials:
```env
POSTGRES_DSN=postgresql+asyncpg://postgres:postgres@localhost:5432/dealflow360
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=your_secure_jwt_secret_key_here
```

#### 4. Run Development Server

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🧪 Running Automated Tests

Run the test suite with `pytest`:

```bash
# Run all unit and integration tests
pytest

# Run with verbose output and test names
pytest -v

# Run only unit tests
pytest tests/unit

# Run with coverage report
pytest --cov=app tests/
```

---

## ⚙️ Core Architectural Principles

### 1. Lifespan & Connection Management
Application startup and teardown lifecycle is controlled via FastAPI's `lifespan` async context manager in [`app/main.py`](file:///e:/DealFlow360/backend/app/main.py). Database connection pools and external connections are cleanly disposed on shutdown.

### 2. RFC 7807 Problem Details
All exceptions and validation errors conform strictly to the standard **RFC 7807 Problem Details** format (`application/problem+json`):
```json
{
  "type": "https://dealflow360.internal/errors/validation-failed",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "The request payload or parameters failed validation schema rules.",
  "instance": "/api/v1/quotes",
  "correlation_id": "9f3f4c6e-5f90-4820-911e-b7e5108b9812",
  "invalid_params": [
    {
      "name": "body -> discount_percent",
      "reason": "Discount cannot exceed 20% without executive approval",
      "type": "value_error"
    }
  ]
}
```

### 3. Distributed Tracing & Structured Logging
Every HTTP request is assigned a `correlation_id` via header (`X-Correlation-ID`) or generated UUID4, injected into `structlog` contextvars, and emitted in JSON logs.

### 4. Asynchronous Event Bus
Domain events (such as `quote.created`, `approval.escalated`, `inventory.allocated`) can be published asynchronously using [`app.core.events.event_bus`](file:///e:/DealFlow360/backend/app/core/events.py), decoupling core workflows from side-effects (notifications, audit logging).
