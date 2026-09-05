import pytest
from app.core.events import EventBus


@pytest.mark.asyncio
async def test_event_bus_publish_and_subscribe():
    bus = EventBus()
    received_payloads = []

    async def sample_handler(payload):
        received_payloads.append(payload)

    bus.subscribe("quote.created", sample_handler)
    
    test_data = {"quote_id": "QT-9901", "total_amount": 125000}
    await bus.publish("quote.created", test_data)

    assert len(received_payloads) == 1
    assert received_payloads[0]["quote_id"] == "QT-9901"


@pytest.mark.asyncio
async def test_event_bus_unsubscribe():
    bus = EventBus()
    received_payloads = []

    async def sample_handler(payload):
        received_payloads.append(payload)

    bus.subscribe("quote.approved", sample_handler)
    bus.unsubscribe("quote.approved", sample_handler)

    await bus.publish("quote.approved", {"quote_id": "QT-9902"})
    assert len(received_payloads) == 0
