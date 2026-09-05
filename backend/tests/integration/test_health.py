import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check_endpoint(async_client: AsyncClient):
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "service" in data
    assert data["service"] == "DealFlow360"
    assert "X-Correlation-ID" in response.headers


@pytest.mark.asyncio
async def test_rfc_7807_not_found_error_format(async_client: AsyncClient):
    response = await async_client.get("/non-existent-endpoint-404")
    assert response.status_code == 404
    assert response.headers["Content-Type"] == "application/problem+json"
    
    data = response.json()
    assert data["status"] == 404
    assert "detail" in data
    assert "title" in data
    assert "correlation_id" in data
    assert "instance" in data
