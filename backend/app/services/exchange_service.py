"""
Servicio de tipo de cambio usando la API de Frankfurter (v2).

URL base actualizada: https://api.frankfurter.dev/v2
Endpoints usados:
  - /v2/rate/USD/GTQ               → tipo de cambio actual
  - /v2/rates?date=YYYY-MM-DD      → tipo de cambio histórico por fecha
"""
from datetime import date, datetime, timezone
from decimal import ROUND_HALF_UP, Decimal

import httpx
from fastapi import HTTPException, status

from app.schemas.exchange import ExchangeRateResult

FRANKFURTER_BASE_URL = "https://api.frankfurter.dev/v2"
REQUEST_TIMEOUT_SECONDS = 10.0


class ExchangeRateService:

    async def _fetch_rate(self, url: str, params: dict) -> dict:
        """
        Método privado que centraliza la llamada HTTP y el manejo de errores.
        Evita duplicar el bloque try/except en cada método público.
        """
        try:
            async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                return response.json()

        except httpx.TimeoutException:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="El servicio de tipo de cambio no respondió a tiempo. "
                       "Intenta de nuevo en unos segundos.",
            )
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"El servicio de tipo de cambio devolvió un error: {e.response.status_code}",
            )
        except httpx.RequestError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="No se pudo conectar al servicio de tipo de cambio.",
            )

    async def get_rate_usd_to_gtq(
        self,
        amount_usd: Decimal,
        target_date: date | None = None,
    ) -> ExchangeRateResult:
        """
        Obtiene el tipo de cambio USD → GTQ.

        Para fecha actual usa /v2/rate/USD/GTQ.
        Para fecha histórica usa /v2/rates?date=YYYY-MM-DD&base=USD&quotes=GTQ.
        """
        query_date = target_date or datetime.now(timezone.utc).date()
        today = datetime.now(timezone.utc).date()

        if query_date >= today:
            # Precio actual: endpoint directo de par de divisas
            url = f"{FRANKFURTER_BASE_URL}/rate/USD/GTQ"
            data = await self._fetch_rate(url, params={})

            # Respuesta: {"base": "USD", "quote": "GTQ", "rate": 7.743251}
            if "rate" not in data:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Respuesta inesperada del servicio de tipo de cambio.",
                )

            rate = Decimal(str(data["rate"]))
            # El endpoint /rate no devuelve fecha, usamos la de hoy
            actual_date = today

        else:
            # Precio histórico: endpoint de rates con parámetro date
            url = f"{FRANKFURTER_BASE_URL}/rates"
            data = await self._fetch_rate(
                url,
                params={"date": query_date.isoformat(), "base": "USD", "quotes": "GTQ"},
            )

            # Respuesta: {"date": "2024-03-15", "base": "USD", "rates": {"GTQ": 7.743251}}
            rates = data.get("rates", {})
            if "GTQ" not in rates:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="La respuesta no contiene el tipo de cambio GTQ.",
                )

            rate = Decimal(str(rates["GTQ"]))
            # Usamos la fecha real devuelta por Frankfurter (puede diferir si fue fin de semana)
            actual_date = date.fromisoformat(data["date"])

        # Calcular GTQ con precisión financiera (2 decimales, redondeo estándar)
        amount_gtq = (amount_usd * rate).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        return ExchangeRateResult(
            rate=rate,
            rate_date=actual_date,
            amount_usd=amount_usd,
            amount_gtq=amount_gtq,
        )

    async def get_rate_gtq_to_usd(
        self,
        amount_gtq: Decimal,
        target_date: date | None = None,
    ) -> ExchangeRateResult:
        """
        Obtiene el tipo de cambio GTQ → USD.
        Don Alex solicita en GTQ; calculamos el equivalente en USD para Carlos.
        """
        query_date = target_date or datetime.now(timezone.utc).date()
        today = datetime.now(timezone.utc).date()

        if query_date >= today:
            url = f"{FRANKFURTER_BASE_URL}/rate/GTQ/USD"
            data = await self._fetch_rate(url, params={})

            if "rate" not in data:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Respuesta inesperada del servicio de tipo de cambio.",
                )

            rate_gtq_to_usd = Decimal(str(data["rate"]))
            actual_date = today

        else:
            url = f"{FRANKFURTER_BASE_URL}/rates"
            data = await self._fetch_rate(
                url,
                params={"date": query_date.isoformat(), "base": "GTQ", "quotes": "USD"},
            )

            rates = data.get("rates", {})
            if "USD" not in rates:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="La respuesta no contiene el tipo de cambio USD.",
                )

            rate_gtq_to_usd = Decimal(str(rates["USD"]))
            actual_date = date.fromisoformat(data["date"])

        # Invertir para almacenar siempre como USD→GTQ (consistencia en la DB)
        rate_usd_to_gtq = (Decimal("1") / rate_gtq_to_usd).quantize(
            Decimal("0.000001"), rounding=ROUND_HALF_UP
        )

        amount_usd = (amount_gtq * rate_gtq_to_usd).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        return ExchangeRateResult(
            rate=rate_usd_to_gtq,
            rate_date=actual_date,
            amount_usd=amount_usd,
            amount_gtq=amount_gtq,
        )