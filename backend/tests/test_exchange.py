"""
Tests del servicio de tipo de cambio.

Mockeamos httpx para no depender de la API externa en los tests.
Esto garantiza tests deterministas y rápidos, sin rate limits.
"""
import pytest
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.exchange_service import ExchangeRateService
from fastapi import HTTPException


class TestExchangeRateService:

    async def test_get_rate_usd_to_gtq_success(self):
        """Conversión USD→GTQ devuelve el resultado correcto."""
        mock_response = MagicMock()
        mock_response.json.return_value = {"rate": 7.75}
        mock_response.raise_for_status = MagicMock()

        with patch("app.services.exchange_service.httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )
            service = ExchangeRateService()
            result = await service.get_rate_usd_to_gtq(Decimal("100.00"))

        assert result.amount_usd == Decimal("100.00")
        assert result.amount_gtq == Decimal("775.00")
        assert result.rate == Decimal("7.75")

    async def test_get_rate_rounds_to_two_decimals(self):
        """El monto GTQ debe redondearse a 2 decimales."""
        mock_response = MagicMock()
        mock_response.json.return_value = {"rate": 7.743251}
        mock_response.raise_for_status = MagicMock()

        with patch("app.services.exchange_service.httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )
            service = ExchangeRateService()
            result = await service.get_rate_usd_to_gtq(Decimal("10.00"))

        # 10 * 7.743251 = 77.43251 → redondeado a 77.43
        assert result.amount_gtq == Decimal("77.43")

    async def test_timeout_raises_503(self):
        """Timeout de la API externa debe devolver 503, no un crash interno."""
        import httpx

        with patch("app.services.exchange_service.httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                side_effect=httpx.TimeoutException("timeout")
            )
            service = ExchangeRateService()

            with pytest.raises(HTTPException) as exc_info:
                await service.get_rate_usd_to_gtq(Decimal("50.00"))

        assert exc_info.value.status_code == 503

    async def test_network_error_raises_503(self):
        """Error de red debe devolver 503."""
        import httpx

        with patch("app.services.exchange_service.httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                side_effect=httpx.RequestError("connection refused")
            )
            service = ExchangeRateService()

            with pytest.raises(HTTPException) as exc_info:
                await service.get_rate_usd_to_gtq(Decimal("50.00"))

        assert exc_info.value.status_code == 503