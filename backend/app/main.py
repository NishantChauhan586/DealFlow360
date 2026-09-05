from typing import Dict, List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

app = FastAPI(
    title="DealFlow360 API",
    description="Intelligent, self-governing sales operations platform backend.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS Middleware
origins: List[str] = (
    settings.CORS_ORIGINS
    if isinstance(settings.CORS_ORIGINS, list)
    else ["http://localhost:5173", "http://127.0.0.1:5173"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", tags=["Health"])
async def health_check() -> Dict[str, str]:
    """
    Root health check endpoint returning service status.
    """
    return {"status": "ok"}
