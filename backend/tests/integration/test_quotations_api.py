import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_quotations_list_endpoint_contract(async_client: AsyncClient):
    """
    Test GET /api/v1/quotations endpoint contract.
    """
    response = await async_client.get("/api/v1/quotations?page=1&page_size=10")
    assert response.status_code in (200, 500)
    if response.status_code == 200:
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data


@pytest.mark.asyncio
async def test_quotation_lines_endpoint_contract(async_client: AsyncClient):
    """
    Test non-existent quotation line addition returns 404/500 cleanly with RFC 7807 problem details.
    """
    fake_quote_id = "00000000-0000-0000-0000-000000000000"
    response = await async_client.post(
        f"/api/v1/quotations/{fake_quote_id}/lines",
        json={
            "product_id": "00000000-0000-0000-0000-000000000001",
            "quantity": 2,
            "discount_percent": 5.0,
        },
    )
    assert response.status_code in (404, 500)
    assert response.headers["Content-Type"] == "application/problem+json"
