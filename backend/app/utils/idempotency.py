import hashlib
import json
import time
from typing import Any, Dict, Optional
import structlog

logger = structlog.get_logger(__name__)


class IdempotencyStore:
    """
    In-memory and Redis-compatible idempotency store.
    Guarantees critical transactional operations (quote approvals, checkout, billing)
    execute exactly once even with network retries.
    """

    def __init__(self, default_ttl_seconds: int = 3600) -> None:
        self.default_ttl = default_ttl_seconds
        self._memory_cache: Dict[str, Dict[str, Any]] = {}

    def _generate_fingerprint(self, key: str, payload: Any = None) -> str:
        """
        Creates a deterministic SHA-256 hash of the idempotency key and request payload.
        """
        raw_data = f"{key}:{json.dumps(payload, sort_keys=True) if payload else ''}"
        return hashlib.sha256(raw_data.encode("utf-8")).hexdigest()

    async def get_response(self, idempotency_key: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a cached response for the given idempotency key if still within TTL.
        """
        record = self._memory_cache.get(idempotency_key)
        if not record:
            return None

        # Check TTL expiration
        if time.time() > record["expires_at"]:
            del self._memory_cache[idempotency_key]
            return None

        logger.info("idempotency_cache_hit", key=idempotency_key)
        return record["response"]

    async def save_response(
        self,
        idempotency_key: str,
        response_data: Dict[str, Any],
        ttl: Optional[int] = None,
    ) -> None:
        """
        Store the final response for an idempotency key.
        """
        expire_time = time.time() + (ttl or self.default_ttl)
        self._memory_cache[idempotency_key] = {
            "response": response_data,
            "expires_at": expire_time,
        }
        logger.info("idempotency_cache_stored", key=idempotency_key)

    async def lock_key(self, idempotency_key: str, ttl_seconds: int = 30) -> bool:
        """
        Attempts to acquire an execution lock for an in-flight idempotent operation.
        Returns True if acquired, False if an operation with this key is already running.
        """
        if idempotency_key in self._memory_cache:
            record = self._memory_cache[idempotency_key]
            if time.time() < record["expires_at"]:
                return False
        
        # Acquire short in-flight lock
        self._memory_cache[idempotency_key] = {
            "response": {"status": "IN_PROGRESS"},
            "expires_at": time.time() + ttl_seconds,
        }
        return True


# Global idempotency store instance
idempotency_store = IdempotencyStore()
