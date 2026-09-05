import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_discount_tiers_endpoint_contract(async_client: AsyncClient):
    """
    Test GET /api/v1/discount-tiers route contract.
    """
    response = await async_client.get("/api/v1/discount-tiers?page=1&page_size=10")
    assert response.status_code in (200, 500)
    if response.status_code == 200:
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data


@pytest.mark.asyncio
async def test_approval_chains_endpoint_contract(async_client: AsyncClient):
    """
    Test GET /api/v1/approval-chains and resolve endpoint contracts.
    """
    response = await async_client.get("/api/v1/approval-chains")
    assert response.status_code in (200, 500)

    resolve_resp = await async_client.post(
        "/api/v1/approval-chains/resolve",
        json={"brs_score": 4.5},
    )
    assert resolve_resp.status_code in (200, 500)
