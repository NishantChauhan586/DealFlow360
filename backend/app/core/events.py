import asyncio
import inspect
from typing import Any, Awaitable, Callable, Dict, List
import structlog

logger = structlog.get_logger(__name__)

EventHandler = Callable[[Any], Awaitable[None] | None]


class EventBus:
    """
    Asynchronous in-memory publish-subscribe event bus.
    Facilitates decoupled domain event handling, audit trails, and side-effects.
    """

    def __init__(self) -> None:
        self._subscribers: Dict[str, List[EventHandler]] = {}

    def subscribe(self, event_name: str, handler: EventHandler) -> None:
        """
        Register a subscriber callback for a specific event name.
        """
        if event_name not in self._subscribers:
            self._subscribers[event_name] = []
        if handler not in self._subscribers[event_name]:
            self._subscribers[event_name].append(handler)
            logger.debug(
                "event_handler_subscribed",
                event_name=event_name,
                handler=getattr(handler, "__name__", str(handler)),
            )

    def unsubscribe(self, event_name: str, handler: EventHandler) -> None:
        """
        Unregister a subscriber callback from an event.
        """
        if event_name in self._subscribers and handler in self._subscribers[event_name]:
            self._subscribers[event_name].remove(handler)
            logger.debug(
                "event_handler_unsubscribed",
                event_name=event_name,
                handler=getattr(handler, "__name__", str(handler)),
            )

    async def publish(self, event_name: str, payload: Any = None) -> None:
        """
        Publish an event to all registered subscribers.
        Executes handlers concurrently while isolating individual errors.
        """
        handlers = self._subscribers.get(event_name, [])
        if not handlers:
            logger.debug("event_published_no_subscribers", event_name=event_name)
            return

        logger.debug(
            "event_published",
            event_name=event_name,
            subscribers_count=len(handlers),
        )

        async def _execute_handler(handler: EventHandler) -> None:
            try:
                if inspect.iscoroutinefunction(handler):
                    await handler(payload)
                else:
                    handler(payload)
            except Exception as exc:
                logger.error(
                    "event_handler_failed",
                    event_name=event_name,
                    handler=getattr(handler, "__name__", str(handler)),
                    error=str(exc),
                    exc_info=True,
                )

        await asyncio.gather(*[_execute_handler(h) for h in handlers], return_exceptions=True)

    def clear(self) -> None:
        """Clear all registered event subscribers (useful for testing)."""
        self._subscribers.clear()


# Global event bus singleton instance
event_bus: EventBus = EventBus()
