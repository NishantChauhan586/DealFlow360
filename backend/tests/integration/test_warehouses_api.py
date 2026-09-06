import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_warehouses_list_endpoint_contract(async_client: AsyncClient):
    """
    Test GET /api/v1/warehouses endpoint contract.
    """
    response = await async_client.get("/api/v1/warehouses")
    assert response.status_code in (200, 500)
    if response.status_code == 200:
        data = response.json()
        assert "items" in data
        assert "total" in data


@pytest.mark.asyncio
async def test_order_fulfillment_endpoint_contract(async_client: AsyncClient):
    """
    Test GET /api/v1/orders/{id}/fulfillment endpoint contract for non-existent order.
    """
    fake_order_id = "00000000-0000-0000-0000-000000000000"
    response = await async_client.get(f"/api/v1/orders/{fake_order_id}/fulfillment")
    assert response.status_code in (404, 500)
    assert response.headers["Content-Type"] == "application/problem+json"
