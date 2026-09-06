import asyncio
import json
import logging
from typing import Any, AsyncGenerator, Dict, Set
from fastapi import APIRouter, Body, Request, status
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/events", tags=["Events & Real-Time Sync"])

# In-memory subscriber queues for Server-Sent Events
_subscribers: Set[asyncio.Queue] = set()


async def publish_event(topic: str, payload: Dict[str, Any] = None) -> None:
    """
    Publish an event to all connected SSE clients.
    Thread-safe and async-safe broadcast mechanism.
    """
    if payload is None:
        payload = {}

    data = json.dumps({"topic": topic, "payload": payload})
    message = f"event: message\ndata: {data}\n\n"

    dead_queues = set()
    for queue in list(_subscribers):
        try:
            queue.put_nowait(message)
        except (asyncio.QueueFull, Exception):
            dead_queues.add(queue)

    for dead in dead_queues:
        _subscribers.discard(dead)


async def _event_generator(request: Request, queue: asyncio.Queue) -> AsyncGenerator[str, None]:
    """
    Yields SSE messages to the connected HTTP client.
    Includes heartbeat keepalives to prevent timeouts.
    """
    try:
        # Send initial connected handshake
        yield f"event: connected\ndata: {json.dumps({'status': 'connected', 'clients': len(_subscribers)})}\n\n"

        while True:
            # Check if client disconnected
            if await request.is_disconnected():
                break

            try:
                # Wait for next event or send keepalive after 15 seconds
                msg = await asyncio.wait_for(queue.get(), timeout=15.0)
                yield msg
            except asyncio.TimeoutError:
                # Send SSE comment as keep-alive heartbeat
                yield ": keepalive\n\n"

    except asyncio.CancelledError:
        pass
    finally:
        _subscribers.discard(queue)


@router.get(
    "",
    summary="Subscribe to Real-Time Platform Events (SSE)",
    description="Connect via EventSource to receive real-time updates across products, prices, warehouses, quotes, and subscriptions.",
)
async def sse_events(request: Request):
    queue: asyncio.Queue = asyncio.Queue(maxsize=200)
    _subscribers.add(queue)

    return StreamingResponse(
        _event_generator(request, queue),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )


@router.post(
    "/publish",
    status_code=status.HTTP_200_OK,
    summary="Publish Event to Real-Time Stream",
    description="Allows frontend applications or external microservices to broadcast real-time sync events.",
)
async def publish_message(body: Dict[str, Any] = Body(...)):
    topic = body.get("topic", "general")
    payload = body.get("payload", {})
    await publish_event(topic, payload)
    return {"status": "broadcast_sent", "topic": topic, "subscribers": len(_subscribers)}
