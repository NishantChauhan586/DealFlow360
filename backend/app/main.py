from contextlib import asynccontextmanager
import time
from typing import Any, AsyncGenerator, Dict, List
import uuid

from fastapi import FastAPI, HTTPException, Request, status
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import structlog

from app.core.config import settings
from app.core.database import check_database_connection, engine
from app.utils.logging import correlation_id_ctx, setup_logging

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    FastAPI Lifespan context manager handling application startup and shutdown events.
    """
    # Startup: configure logging and verify critical infrastructure connections
    setup_logging()
    logger.info(
        "application_startup_initiated",
        project=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
    )

    db_healthy = await check_database_connection()
    if db_healthy:
        logger.info("database_connection_established", dsn=settings.POSTGRES_DSN)
        try:
            from app.models.base import Base
            # Import models to ensure registered
            import app.models
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("database_tables_initialized")
        except Exception as err:
            logger.error("database_table_initialization_failed", error=str(err))
    else:
        logger.warning(
            "database_connection_failed",
            detail="Could not reach database server. Service started in degraded state.",
        )

    yield

    # Shutdown: clean up engine connection pools and background resources
    logger.info("application_shutdown_initiated")
    await engine.dispose()
    logger.info("database_connections_disposed")


app = FastAPI(
    title=f"{settings.PROJECT_NAME} API",
    description=settings.DESCRIPTION,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan,
)

# ------------------------------------------------------------------------------
# Middlewares
# ------------------------------------------------------------------------------

# 1. CORS Middleware
origins: List[str] = (
    settings.CORS_ORIGINS
    if isinstance(settings.CORS_ORIGINS, list)
    else ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 2. Correlation ID & Request Timing Middleware
@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    # Extract existing correlation ID or generate a new UUID4
    correlation_id = (
        request.headers.get("X-Correlation-ID")
        or request.headers.get("X-Request-ID")
        or str(uuid.uuid4())
    )
    token = correlation_id_ctx.set(correlation_id)
    start_time = time.perf_counter()

    logger.info(
        "http_request_received",
        method=request.method,
        path=request.url.path,
        client_ip=request.client.host if request.client else "unknown",
    )

    try:
        response = await call_next(request)
        process_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
        response.headers["X-Correlation-ID"] = correlation_id
        response.headers["X-Process-Time-Ms"] = str(process_time_ms)

        logger.info(
            "http_request_completed",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=process_time_ms,
        )
        return response
    except Exception as exc:
        process_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.error(
            "http_request_unhandled_exception",
            method=request.method,
            path=request.url.path,
            duration_ms=process_time_ms,
            error=str(exc),
            exc_info=True,
        )
        raise exc
    finally:
        correlation_id_ctx.reset(token)


# ------------------------------------------------------------------------------
# RFC 7807 Problem Details Global Exception Handlers
# ------------------------------------------------------------------------------

def create_problem_response(
    status_code: int,
    title: str,
    detail: str,
    instance: str,
    type_uri: str = "about:blank",
    invalid_params: Any = None,
) -> JSONResponse:
    """
    Construct an RFC 7807 compliant Problem Details JSON response.
    Content-Type: application/problem+json
    """
    content: Dict[str, Any] = {
        "type": type_uri,
        "title": title,
        "status": status_code,
        "detail": detail,
        "instance": instance,
        "correlation_id": correlation_id_ctx.get(),
    }
    if invalid_params is not None:
        content["invalid_params"] = invalid_params

    return JSONResponse(
        status_code=status_code,
        content=content,
        media_type="application/problem+json",
        headers={"Content-Type": "application/problem+json"},
    )


@app.exception_handler(StarletteHTTPException)
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    status_code = getattr(exc, "status_code", 500)
    detail = getattr(exc, "detail", str(exc))
    title_map = {
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        409: "Conflict",
        422: "Unprocessable Entity",
        500: "Internal Server Error",
    }
    return create_problem_response(
        status_code=status_code,
        title=title_map.get(status_code, "HTTP Error"),
        detail=str(detail),
        instance=request.url.path,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = []
    for err in exc.errors():
        loc = " -> ".join([str(p) for p in err.get("loc", [])])
        errors.append({
            "name": loc,
            "reason": err.get("msg", "Invalid parameter"),
            "type": err.get("type", "validation_error"),
        })

    return create_problem_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        title="Unprocessable Entity",
        detail="The request payload or parameters failed validation schema rules.",
        instance=request.url.path,
        type_uri="https://dealflow360.internal/errors/validation-failed",
        invalid_params=errors,
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(
        "unhandled_server_error",
        error=str(exc),
        path=request.url.path,
        exc_info=True,
    )
    detail = (
        str(exc)
        if settings.ENVIRONMENT == "development"
        else "An unexpected internal error occurred. Please refer to correlation_id for support."
    )
    return create_problem_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        title="Internal Server Error",
        detail=detail,
        instance=request.url.path,
        type_uri="https://dealflow360.internal/errors/internal-server-error",
    )


# ------------------------------------------------------------------------------
# Core Endpoints & Route Mounting
# ------------------------------------------------------------------------------

from app.routers.api_v1 import api_v1_router

app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["Health"], summary="Comprehensive Health Check")
@app.get("/api/health", tags=["Health"], include_in_schema=False)
async def health_check() -> Dict[str, Any]:
    """
    Standard health check verifying API status, database connectivity, and runtime metrics.
    """
    db_ok = await check_database_connection()
    status_str = "healthy" if db_ok else "degraded"

    return {
        "status": status_str,
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": "connected" if db_ok else "disconnected",
        "timestamp": time.time(),
        "correlation_id": correlation_id_ctx.get(),
    }

