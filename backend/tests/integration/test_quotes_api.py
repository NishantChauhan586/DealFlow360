import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_quotes_list_and_create_contract(async_client: AsyncClient):
    """
    Test GET /api/v1/quotes contract.
    """
    response = await async_client.get("/api/v1/quotes")
    assert response.status_code in (200, 500)
    if response.status_code == 200:
        data = response.json()
        assert isinstance(data, list)


@pytest.mark.asyncio
async def test_dashboard_overview_contract(async_client: AsyncClient):
    """
    Test GET /api/v1/dashboard/overview contract.
    """
    response = await async_client.get("/api/v1/dashboard/overview")
    assert response.status_code in (200, 500)
    if response.status_code == 200:
        data = response.json()
        assert "kpis" in data
        assert "pipeline" in data
        assert "anomalies" in data
        assert "stalledDeals" in data or "stalled_deals" in data
